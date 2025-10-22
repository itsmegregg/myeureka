<?php

namespace App\Http\Controllers;

use App\Exports\ProductMixCategoryExport;
use App\Http\Resources\DiscountReportCollection;
use App\Http\Resources\ProductMixCategoryCollection;
use App\Http\Resources\ProductMixCategoryResource;
use App\Http\Resources\ProductMixItemCollection;
use App\Http\Resources\ProductMixItemResource;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Header;
use App\Models\ItemDetail;
use App\Models\Product;
use App\Models\Store;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class ItemSalesController extends Controller
{
    public function ProductMix(Request $request)
    {
        $startDate = $request->input('from_date');
        $endDate = $request->input('to_date');
        $branch = strtoupper($request->input('branch_name', 'ALL'));
        $product = strtoupper($request->input('product_code', 'ALL'));
        $store = strtoupper($request->input('store_name', 'ALL')); // Changed from store_id to concept_id
        $terminal = strtoupper($request->input('terminal_number', 'ALL'));
        $perPage = $request->input('per_page', 15);

        $stripLeadingZeros = static function (string $value): string {
            $normalized = ltrim($value, '0');

            return $normalized === '' ? '0' : $normalized;
        };

        $normalizedTerminal = $terminal === 'ALL' ? null : $stripLeadingZeros($terminal);
        
        // Main query for product mix
        $productMix = ItemDetail::select(
            'item_details.product_code',
            'products.product_description',
            DB::raw('SUM(CAST(item_details.qty AS NUMERIC)) as total_quantity'),
            DB::raw('SUM(CAST(item_details.net_total AS NUMERIC)) as total_net_sales')
        )
        ->join('header', function ($join) use ($normalizedTerminal) {
            $join->on('item_details.si_number', '=', DB::raw('CAST(header.si_number AS INTEGER)'))
                 ->on(DB::raw('item_details.terminal_number::integer'), '=', DB::raw('header.terminal_number::integer'))
                 ->on(DB::raw('UPPER(item_details.branch_name)'), '=', DB::raw('UPPER(header.branch_name)'))
                 ->when($normalizedTerminal !== null, function ($query) use ($normalizedTerminal) {
                     $query->whereRaw('header.terminal_number::integer = ?', [$normalizedTerminal]);
                 });
        })
        ->leftJoin('products', function($join) {
            $join->on('item_details.product_code', '=', 'products.product_code');
        })
        ->whereBetween('header.date', [$startDate, $endDate])
        ->where("item_details.void_flag", 0);


        if ($store !== 'ALL') {
            $productMix->whereRaw('UPPER(item_details.store_name) = ?', [$store]);
        }

        if ($product !== 'ALL') {
            $productMix->whereRaw('UPPER(item_details.product_code) = ?', [$product]);
        }

        if ($branch !== 'ALL') {
            $productMix->whereRaw('UPPER(item_details.branch_name) = ?', [$branch]);
        }


        $productMix->groupBy('item_details.product_code', 'products.product_description')
                   ->orderBy('total_quantity', 'desc');

        // Get all results at once without pagination
        $results = $productMix->get();

        if ($results->isEmpty()) {
            // Check if we have any data in the date range
            $hasData = Header::whereBetween('date', [$startDate, $endDate])->exists();
            if (!$hasData) {
                return response()->json([
                    'message' => 'No data found in the selected date range',
                    'debug' => [
                        'date_range' => [$startDate, $endDate],
                        'branch' => $branch,
                        'store' => $store,
                        'product' => $product,
                        'terminal' => $terminal
                    ]
                ]);
            }
        }

        // Fetch combo items for each combo product
        $results = $results->map(function ($item) use ($startDate, $endDate, $branch, $store, $normalizedTerminal) {
            // Check if this is a combo product by looking for items that reference it as combo_main_code
            $comboItems = ItemDetail::select(
                'item_details.product_code',
                'products.product_description',
                DB::raw('SUM(CAST(item_details.qty AS NUMERIC)) as total_quantity'),
                DB::raw('SUM(CAST(item_details.net_total AS NUMERIC)) as net_sales')
            )
            ->join('header', function ($join) use ($normalizedTerminal) {
                $join->on('item_details.si_number', '=', DB::raw('CAST(header.si_number AS INTEGER)'))
                     ->on(DB::raw('item_details.terminal_number::integer'), '=', DB::raw('header.terminal_number::integer'))
                     ->on(DB::raw('UPPER(item_details.branch_name)'), '=', DB::raw('UPPER(header.branch_name)'))
                     ->when($normalizedTerminal !== null, function ($query) use ($normalizedTerminal) {
                         $query->whereRaw('header.terminal_number::integer = ?', [$normalizedTerminal]);
                     });
            })
            ->leftJoin('products', function($join) {
                $join->on('item_details.product_code', '=', 'products.product_code');
            })
            ->where('item_details.combo_header', $item->product_code)
            ->whereBetween('header.date', [$startDate, $endDate])
            ->where("item_details.void_flag", 0);
            
            if ($store !== 'ALL') {
                $comboItems->whereRaw('UPPER(item_details.store_name) = ?', [$store]);
            }
            
            if ($branch !== 'ALL') {
                $comboItems->whereRaw('UPPER(item_details.branch_name) = ?', [$branch]);
            }


            
            $comboItems = $comboItems->groupBy('item_details.product_code', 'products.product_description')
                                    ->get();
            
            if ($comboItems->isNotEmpty()) {
                $item->combo_items = $comboItems;
            }
            
            return $item;
        });

        // Return results as JSON directly since we're no longer using pagination
        return response()->json([
            'data' => $results,
            'meta' => [
                'from_date' => $startDate,
                'to_date' => $endDate,
                'branch' => $branch,
                'store' => $store,
                'product' => $product,
                'terminal' => $terminal
            ]
        ]);
    }

    /**
     * Get product mix data by category
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function productMixCategory(Request $request)
    {
        $startDate = $request->input('from_date');
        $endDate = $request->input('to_date');
        $branch = strtoupper($request->input('branch_name', 'ALL'));
        $category = strtoupper($request->input('category_code', 'ALL'));
        $store = strtoupper($request->input('store_name', 'ALL'));

        try {
            $query = ItemDetail::select([
                'categories.category_code',
                'categories.category_description',
                'item_details.product_code',
                'products.product_description',
                DB::raw('SUM(CAST(item_details.qty AS NUMERIC)) as quantity'),
                DB::raw('SUM(CAST(item_details.net_total AS NUMERIC)) as net_sales')
            ])
            ->join('header', function ($join) {
                $join->on('item_details.si_number', '=', DB::raw('CAST(header.si_number AS INTEGER)'))
                     ->on('item_details.terminal_number', '=', 'header.terminal_number')
                     ->on('item_details.branch_name', '=', 'header.branch_name');
            })
            ->join('products', 'item_details.product_code', '=', 'products.product_code')
            ->join('categories', 'products.category_code', '=', 'categories.category_code')
            ->whereBetween('header.date', [$startDate, $endDate])
            ->where("item_details.void_flag", 0)
            ->when($store !== 'ALL', function ($q) use ($store) {
                return $q->whereRaw('UPPER(item_details.store_name) = ?', [$store]);
            })
            ->when($branch !== 'ALL', function ($q) use ($branch) {
                return $q->whereRaw('UPPER(item_details.branch_name) = ?', [$branch]);
            })
            ->when($category !== 'ALL', function ($q) use ($category) {
                return $q->whereRaw('UPPER(products.category_code) = ?', [$category]);
            })
            ->groupBy(
                'categories.category_code',
                'categories.category_description',
                'item_details.product_code',
                'products.product_description'
            );

            $results = $query->get();

            if ($results->isEmpty()) {
                // Check if we have any data in the date range
                $hasData = Header::whereBetween('date', [$startDate, $endDate])->exists();
                if (!$hasData) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'No data found in the selected date range',
                        'data' => [],
                        'meta' => [
                            'from_date' => $startDate,
                            'to_date' => $endDate,
                            'branch' => $branch,
                            'store' => $store,
                            'category' => $category
                        ]
                    ]);
                }
            }

            $groupedResults = [];
            foreach ($results as $item) {
                // Check if $item is an array or object and access properties accordingly
                $categoryCode = is_array($item) ? $item['category_code'] : $item->category_code;
                
                if (!isset($groupedResults[$categoryCode])) {
                    $groupedResults[$categoryCode] = [
                        'category_code' => $categoryCode,
                        'category_description' => is_array($item) ? $item['category_description'] : $item->category_description,
                        'product' => []
                    ];
                }
                
                $productData = [
                    'product_code' => is_array($item) ? $item['product_code'] : $item->product_code,
                    'description' => is_array($item) ? $item['product_description'] : $item->product_description,
                    'quantity' => (int) (is_array($item) ? $item['quantity'] : $item->quantity),
                    'net_sales' => (float) number_format(is_array($item) ? $item['net_sales'] : $item->net_sales, 2, '.', '')
                ];

                // Fetch combo items for this product
                $comboItems = ItemDetail::select(
                    'item_details.product_code',
                    'products.product_description as description',
                    DB::raw('SUM(CAST(item_details.qty AS NUMERIC)) as total_quantity'),
                    DB::raw('SUM(CAST(item_details.net_total AS NUMERIC)) as net_sales')
                )
                ->join('header', function ($join) {
                    $join->on('item_details.si_number', '=', DB::raw('CAST(header.si_number AS INTEGER)'))
                         ->on('item_details.terminal_number', '=', 'header.terminal_number')
                         ->on('item_details.branch_name', '=', 'header.branch_name');
                })
                ->leftJoin('products', 'item_details.product_code', '=', 'products.product_code')
                ->where('item_details.combo_header', $item->product_code)
                ->whereBetween('header.date', [$startDate, $endDate])
                ->where("item_details.void_flag", 0);
                
                if ($store !== 'ALL') {
                    $comboItems->whereRaw('UPPER(item_details.store_name) = ?', [$store]);
                }
                
                if ($branch !== 'ALL') {
                    $comboItems->whereRaw('UPPER(item_details.branch_name) = ?', [$branch]);
                }
                
                $comboItems = $comboItems->groupBy('item_details.product_code', 'products.product_description')
                                        ->get();
                
                if ($comboItems->isNotEmpty()) {
                    $productData['combo_items'] = $comboItems->map(function($comboItem) {
                        return [
                            'product_code' => $comboItem->product_code,
                            'description' => $comboItem->description,
                            'total_quantity' => (int) $comboItem->total_quantity,
                            'net_sales' => (float) number_format($comboItem->net_sales, 2, '.', '')
                        ];
                    })->toArray();
                }
                
                $groupedResults[$categoryCode]['product'][] = $productData;
            }

            // Return all data for PDF/Excel export
            return response()->json([
                'status' => 'success',
                'data' => array_values($groupedResults),
                'meta' => [
                    'from_date' => $startDate,
                    'to_date' => $endDate,
                    'branch' => $branch,
                    'store_name' => $store,
                    'category' => $category
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred',
                'error' => $e->getMessage(),
                'debug' => config('app.debug') ? $e->getTrace() : null
            ], 500);
        }
}
    


    public function productMixCategoryAll(Request $request)
    {
        $startDate = $request->input('from_date');
        $endDate = $request->input('to_date');
        $branch = strtoupper($request->input('branch_id', 'ALL'));
        $category = strtoupper($request->input('category_code', 'ALL'));
        $store = strtoupper($request->input('concept_id', 'ALL')); // Changed from store_id to concept_id

        try {
            $query = ItemDetail::select([
                'categories.category_code',
                'categories.category_description',
                'item_details.product_code',
                'products.product_description',
                DB::raw('SUM(CAST(item_details.qty AS NUMERIC)) as quantity'),
                DB::raw('SUM(CAST(item_details.net_total AS NUMERIC)) as net_sales')
            ])
            ->join('header', function ($join) {
                $join->on('item_details.si_number', '=', 'header.si_number')
                     ->on('item_details.terminal_number', '=', 'header.terminal_number')
                     ->on('item_details.branch_name', '=', 'header.branch_name');
            })
            ->join('products', 'item_details.product_code', '=', 'products.product_code')
            ->join('categories', 'products.category_code', '=', 'categories.category_code')
            ->whereBetween('header.date', [$startDate, $endDate])
            ->where("item_details.void_flag", 0)
            ->when($store !== 'ALL', function ($q) use ($store) {
                return $q->where('item_details.store_name', $store);
            })
            ->when($branch !== 'ALL', function ($q) use ($branch) {
                return $q->where('item_details.branch_name', $branch);
            })
            ->when($category !== 'ALL', function ($q) use ($category) {
                return $q->where('products.category_code', $category);
            })
            ->groupBy(
                'categories.category_code',
                'categories.category_description',
                'item_details.product_code',
                'products.product_description'
            );

            $results = $query->get();

            if ($results->isEmpty()) {
                // Check if we have any data in the date range
                $hasData = Header::whereBetween('date', [$startDate, $endDate])->exists();
                if (!$hasData) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'No data found in the selected date range',
                        'data' => [],
                        'meta' => [
                            'from_date' => $startDate,
                            'to_date' => $endDate,
                            'branch' => $branch,
                            'store' => $store,
                            'category' => $category
                        ]
                    ]);
                }
            }

            $groupedResults = [];
            foreach ($results as $item) {
                // Check if $item is an array or object and access properties accordingly
                $categoryCode = is_array($item) ? $item['category_code'] : $item->category_code;
                
                if (!isset($groupedResults[$categoryCode])) {
                    $groupedResults[$categoryCode] = [
                        'category_code' => $categoryCode,
                        'category_description' => is_array($item) ? $item['category_description'] : $item->category_description,
                        'product' => []
                    ];
                }
                
                $productData = [
                    'product_code' => is_array($item) ? $item['product_code'] : $item->product_code,
                    'description' => is_array($item) ? $item['product_description'] : $item->product_description,
                    'quantity' => (int) (is_array($item) ? $item['quantity'] : $item->quantity),
                    'net_sales' => (float) number_format(is_array($item) ? $item['net_sales'] : $item->net_sales, 2, '.', '')
                ];

                // Fetch combo items for this product
                $comboItems = ItemDetail::select(
                    'item_details.product_code',
                    'products.product_description as description',
                    DB::raw('SUM(CAST(item_details.qty AS NUMERIC)) as total_quantity'),
                    DB::raw('SUM(CAST(item_details.net_total AS NUMERIC)) as net_sales')
                )
                ->join('header', function ($join) {
                    $join->on('item_details.si_number', '=', 'header.si_number')
                         ->on('item_details.terminal_number', '=', 'header.terminal_number')
                         ->on('item_details.branch_name', '=', 'header.branch_name');
                })
                ->leftJoin('products', 'item_details.product_code', '=', 'products.product_code')
                ->where('item_details.combo_header', $item->product_code)
                ->whereBetween('header.date', [$startDate, $endDate])
                ->where('item_details.void_flag', 0);
                
                if ($store !== 'ALL') {
                    $comboItems->where('item_details.store_name', $store);
                }
                
                if ($branch !== 'ALL') {
                    $comboItems->where('item_details.branch_name', $branch);
                }
                
                $comboItems = $comboItems->groupBy('item_details.product_code', 'products.product_description')
                                        ->get();
                
                if ($comboItems->isNotEmpty()) {
                    $productData['combo_items'] = $comboItems->map(function($comboItem) {
                        return [
                            'product_code' => $comboItem->product_code,
                            'description' => $comboItem->description,
                            'total_quantity' => (int) $comboItem->total_quantity,
                            'net_sales' => (float) number_format($comboItem->net_sales, 2, '.', '')
                        ];
                    })->toArray();
                }
                
                $groupedResults[$categoryCode]['product'][] = $productData;
            }

            // Return all data for PDF/Excel export
            return response()->json([
                'status' => 'success',
                'data' => array_values($groupedResults),
                'meta' => [
                    'from_date' => $startDate,
                    'to_date' => $endDate,
                    'branch' => $branch,
                    'store_name' => $store,
                    'category' => $category
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred',
                'error' => $e->getMessage(),
                'debug' => config('app.debug') ? $e->getTrace() : null
            ], 500);
        }
    }

    public function discountReport(Request $request)
    {
        try {
            // Validate request parameters
            $request->validate([
                'from_date' => 'nullable|date',
                'to_date' => 'nullable|date',
                'branch_id' => 'nullable',
                'store_id' => 'nullable',
                'per_page' => 'nullable|integer|min:1|max:1000',
            ]);
            
            $perPage = $request->input('per_page', 15); // Default to 15 per page
            
            $query = ItemDetail::query()
                ->select(
                    DB::raw('DATE(header.date) as transaction_date'),
                    DB::raw('ROUND(SUM(CAST(senior_disc AS NUMERIC)), 2) as senior_disc'),
                    DB::raw('ROUND(SUM(CAST(pwd_disc AS NUMERIC)), 2) as pwd_disc'),
                    DB::raw('ROUND(SUM(CAST(other_disc AS NUMERIC)), 2) as other_disc'),
                    DB::raw('ROUND(SUM(CAST(open_disc AS NUMERIC)), 2) as open_disc'),
                    DB::raw('ROUND(SUM(CAST(employee_disc AS NUMERIC)), 2) as employee_disc'),
                    DB::raw('ROUND(SUM(CAST(vip_disc AS NUMERIC)), 2) as vip_disc'),
                    DB::raw('ROUND(SUM(CAST(promo AS NUMERIC)), 2) as promo'),
                    DB::raw('ROUND(SUM(CAST(free AS NUMERIC)), 2) as free')
                )
                ->join('header', function ($join) {
                    $join->on('item_details.si_number', '=', 'header.si_number')
                         ->on('item_details.terminal_number', '=', 'header.terminal_number')
                         ->on('item_details.branch_code', '=', 'header.branch_code');
                })
                ->where('item_details.void_flag', 0);

            // Filter by date range - Using from_date and to_date to match frontend
            if ($request->has('from_date') && $request->has('to_date')) {
                $fromDate = $request->from_date;
                $toDate = $request->to_date;
                
                // Add time parts to ensure full day coverage
                $fromDate = $fromDate . ' 00:00:00';
                $toDate = $toDate . ' 23:59:59';
                
    
                
                $query->whereRaw("header.date >= ? AND header.date <= ?", [$fromDate, $toDate]);
            }

            // Filter by store if provided and not 'all'
            if ($request->has('store_id') && $request->store_id !== 'all' && $request->store_id !== 'ALL') {
                $query->where('store_id', $request->store_id);
            }

            // Filter by branch if provided and not 'all'
            if ($request->has('branch_id') && $request->branch_id !== 'all' && $request->branch_id !== 'ALL') {
                $query->where('branch_id', $request->branch_id);
            }

            // Add proper grouping and ordering
            $query->groupBy(DB::raw('DATE(header.date)'))
                ->orderBy('transaction_date', 'asc');
                
            // Get paginated results
            $discountData = $query->paginate($perPage);

            // Return data with resource transformation
            return new \App\Http\Resources\DiscountReportCollection($discountData);

        } catch (\Exception $e) {
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to retrieve discount data',
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTrace() : [],
            ], 500);
        }
    }

    public function ProductMixAll(Request $request)
    {
        $startDate = $request->input('from_date');
        $endDate = $request->input('to_date');
        $branch = strtoupper($request->input('branch_name', 'ALL'));
        $product = strtoupper($request->input('product_code', 'ALL'));
        $terminal = strtoupper($request->input('terminal_number', 'ALL'));
        $store = strtoupper($request->input('store_name', 'ALL')); // Changed from store_id to concept_id
        
        // Main query for product mix without pagination - using same structure as ProductMix
        $productMix = ItemDetail::select(
            'item_details.product_code',
            'products.product_description',
            DB::raw('SUM(CAST(item_details.qty AS NUMERIC)) as total_quantity'),
            DB::raw('SUM(CAST(item_details.net_total AS NUMERIC)) as total_net_sales')
        )
        ->join('header', function ($join) {
            $join->on('item_details.si_number', '=', 'header.si_number')
                 ->on('item_details.terminal_number', '=', 'header.terminal_number')
                 ->on('item_details.branch_name', '=', 'header.branch_name');
        })
        ->leftJoin('products', function($join) {
            $join->on('item_details.product_code', '=', 'products.product_code');
        })
        ->whereBetween('header.date', [$startDate, $endDate])
        ->where("item_details.void_flag", 0);

        if ($store !== 'ALL') {
            $productMix->where('item_details.store_name', $store);
        }

        if ($product !== 'ALL') {
            $productMix->where('item_details.product_code', $product);
        }

        if ($branch !== 'ALL') {
            $productMix->where('item_details.branch_name', $branch);
        }

        if ($terminal !== 'ALL') {
            $productMix->where('item_details.terminal_number', $terminal);
        }

        $productMix->groupBy('item_details.product_code', 'products.product_description')
                   ->orderBy('total_quantity', 'desc');

        // Get all results without pagination
        $results = $productMix->get();

        if ($results->isEmpty()) {
            // Check if we have any data in the date range
            $hasData = Header::whereBetween('date', [$startDate, $endDate])->exists();
            if (!$hasData) {
                return response()->json([
                    'message' => 'No data found in the selected date range',
                    'debug' => [
                        'date_range' => [$startDate, $endDate],
                        'branch' => $branch,
                        'store' => $store,
                        'product' => $product
                    ]
                ]);
            }
        }

        // Fetch combo items for each combo product
        $results = $results->map(function ($item) use ($startDate, $endDate, $branch, $store, $terminal) {
            // Check if this is a combo product by looking for items that reference it as combo_header
            $comboItems = ItemDetail::select(
                'item_details.product_code',
                'products.product_description',
                DB::raw('SUM(CAST(item_details.qty AS NUMERIC)) as total_quantity'),
                DB::raw('SUM(CAST(item_details.net_total AS NUMERIC)) as net_sales')
            )
            ->join('header', function ($join) use ($terminal) {
                $join->on('item_details.si_number', '=', 'header.si_number')
                     ->on('item_details.terminal_number', '=', 'header.terminal_number')
                     ->on('item_details.branch_name', '=', 'header.branch_name');
            })
            ->leftJoin('products', function($join) {
                $join->on('item_details.product_code', '=', 'products.product_code');
            })
            ->where('item_details.combo_header', $item->product_code)
            ->whereBetween('header.date', [$startDate, $endDate])
            ->where("item_details.void_flag", 0);
            
            if ($store !== 'ALL') {
                $comboItems->where('item_details.store_name', $store);
            }
            
            if ($branch !== 'ALL') {
                $comboItems->where('item_details.branch_name', $branch);
            }

            if ($terminal !== 'ALL') {
                $comboItems->where('item_details.terminal_number', $terminal);
            }
            
            $comboItems = $comboItems->groupBy('item_details.product_code', 'products.product_description')
                                    ->get();
            
            if ($comboItems->isNotEmpty()) {
                $item->combo_items = $comboItems;
            } else {
                $item->combo_items = collect([]);
            }
            
            return $item;
        });
        
        // Transform the data using the same format as ProductMixItemResource
        $formattedResults = $results->map(function($item) {
            $data = [
                'product_code' => $item->product_code,
                'product_description' => $item->product_description,
                'total_quantity' => (int) $item->total_quantity,
                'total_net_sales' => (float) number_format($item->total_net_sales, 2, '.', ''),
                'combo_items' => [],
            ];
            
            // Handle combo items if they exist
            if (isset($item->combo_items) && $item->combo_items->isNotEmpty()) {
                $data['combo_items'] = $item->combo_items->map(function($combo) {
                    return [
                        'product_code' => $combo->product_code,
                        'description' => $combo->product_description,
                        'total_quantity' => (int) $combo->total_quantity,
                        'net_sales' => (float) number_format($combo->net_sales, 2, '.', ''),
                    ];
                });
            }
            
            return $data;
        });
        
        // Return all data for PDF export
        return response()->json([
            'status' => 'success',
            'data' => $formattedResults,
            'meta' => [
                'from_date' => $startDate,
                'to_date' => $endDate,
                'branch' => $branch,
                'concept_id' => $store,
                'product' => $product
            ]
        ]);
    }
}
