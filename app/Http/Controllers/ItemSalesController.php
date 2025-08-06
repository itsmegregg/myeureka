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
use App\Models\ItemDetails;
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
        
        // Main query for product mix
        $productMix = ItemDetails::select(
            'item_details.product_code',
            'product.product_description',
            DB::raw('SUM(item_details.qty) as total_quantity'),
            DB::raw('SUM(item_details.net_total) as total_net_sales')
        )
        ->join('header', function ($join) use ($terminal) {
            $join->on('item_details.si_number', '=', 'header.si_number')
                 ->on('item_details.terminal_number', '=', 'header.terminal_number')
                 ->on('item_details.branch_name', '=', 'header.branch_name')
                 ->when($terminal !== 'ALL', function ($query) use ($terminal) { $query->where('header.terminal_number', $terminal); });
        })
        ->leftJoin('product', function($join) {
            $join->on('item_details.product_code', '=', 'product.product_code');
        })
        ->whereBetween('header.date', [$startDate, $endDate]);

        if ($store !== 'ALL') {
            $productMix->where('item_details.store_name', $store);
        }

        if ($product !== 'ALL') {
            $productMix->where('item_details.product_code', $product);
        }

        if ($branch !== 'ALL') {
            $productMix->where('item_details.branch_name', $branch);
        }


        $productMix->groupBy('item_details.product_code', 'product.product_description')
                   ->orderBy('total_quantity', 'desc');

        // Paginate the results with smaller page size
        $results = $productMix->paginate($perPage);

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
        $results->getCollection()->transform(function ($item) use ($startDate, $endDate, $branch, $store, $terminal) {
            // Check if this is a combo product by looking for items that reference it as combo_main_code
            $comboItems = ItemDetails::select(
                'item_details.product_code',
                'product.product_description',
                DB::raw('SUM(item_details.qty) as total_quantity'),
                DB::raw('SUM(item_details.net_total) as net_sales')
            )
            ->join('header', function ($join) use ($terminal) {
                $join->on('item_details.si_number', '=', 'header.si_number')
                     ->on('item_details.terminal_number', '=', 'header.terminal_number')
                     ->on('item_details.branch_name', '=', 'header.branch_name')
                     ->when($terminal !== 'ALL', function ($query) use ($terminal) { $query->where('header.terminal_number', $terminal); });
            })
            ->leftJoin('product', function($join) {
                $join->on('item_details.product_code', '=', 'product.product_code');
            })
            ->where('item_details.combo_header', $item->product_code)
            ->whereBetween('header.date', [$startDate, $endDate]);
            
            if ($store !== 'ALL') {
                $comboItems->where('item_details.store_name', $store);
            }
            
            if ($branch !== 'ALL') {
                $comboItems->where('item_details.branch_name', $branch);
            }


            
            $comboItems = $comboItems->groupBy('item_details.product_code', 'product.product_description')
                                    ->get();
            
            if ($comboItems->isNotEmpty()) {
                $item->combo_items = $comboItems;
            }
            
            return $item;
        });

        // Use the ProductMixItemCollection to transform the results
        return new ProductMixItemCollection($results);
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
        $terminal = strtoupper($request->input('terminal_number', 'ALL'));

        try {
            $data = $this->getProductMixCategoryData($startDate, $endDate, $branch, $category, $store, $terminal);
            
            if (empty($data['groupedResults'])) {
                return response()->json([
                    'message' => 'No data found in the selected date range',
                    'data' => [],
                    'meta' => [
                        'from_date' => $startDate,
                        'to_date' => $endDate,
                        'branch' => $branch,
                        'store_id' => $store,
                        'category' => $category,
                    'terminal' => $terminal
                    ]
                ]);
            }

            // Just return the array values directly without pagination
            return response()->json([
                'data' => array_values($data['groupedResults']),
                'meta' => [
                    'from_date' => $startDate,
                    'to_date' => $endDate,
                    'branch' => $branch,
                    'store_id' => $store,
                    'category' => $category,
                    'terminal' => $terminal
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred',
                'error' => $e->getMessage(),
                'debug' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
    
   
    private function getProductMixCategoryData($startDate, $endDate, $branch, $category, $store, $terminal)
{
    // Use the summary table for main data
    $query = \App\Models\ItemDetailsDailySummary::select([ 
        'category.category_code',
        'category.category_description',
        'item_details_daily_summary.product_code',
        'product.product_description',
        DB::raw('SUM(item_details_daily_summary.quantity) as quantity'),
        DB::raw('SUM(item_details_daily_summary.net_sales) as net_sales')
    ])
    ->join('product', function($join) {
        $join->on(DB::raw('item_details_daily_summary.product_code COLLATE utf8mb4_unicode_ci'), '=', 'product.product_code');
    })
    ->join('category', 'product.category_code', '=', 'category.category_code')
    ->whereBetween('item_details_daily_summary.date', [$startDate, $endDate])
    ->when($store !== 'ALL', function ($q) use ($store) {
        return $q->where('item_details_daily_summary.store_name', $store);
    })
    ->when($branch !== 'ALL', function ($q) use ($branch) {
        return $q->where('item_details_daily_summary.branch_name', $branch);
    })
    ->when($category !== 'ALL', function ($q) use ($category) {
        return $q->where('product.category_code', $category);
    })
    // Note: We need to handle terminal filtering in the combo items section
    ->groupBy([ 
        'category.category_code',
        'category.category_description',
        'item_details_daily_summary.product_code',
        'product.product_description'
    ])
    ->orderBy('quantity', 'desc'); // Sort by quantity descending

    $results = $query->get();

    if ($results->isEmpty()) {
        // Check if we have any data in the date range
        $hasData = DB::table('item_details_daily_summary')
            ->whereBetween('date', [$startDate, $endDate])
            ->exists();
            
        if (!$hasData) {
            return ['groupedResults' => []];
        }
    }

    // Group results by category for transformation
    $groupedResults = [];
    foreach ($results as $item) {
        $categoryCode = $item->category_code;
        
        if (!isset($groupedResults[$categoryCode])) {
            $groupedResults[$categoryCode] = [
                'category_code' => $categoryCode,
                'category_description' => $item->category_description,
                'product' => []
            ];
        }
        
        $productData = [
            'product_code' => $item->product_code,
            'description' => $item->product_description,
            'quantity' => (int) $item->quantity,
            'net_sales' => (float) number_format($item->net_sales, 2, '.', '')
        ];

        // For combo items, we still need to query the original tables
        // This is because combo item relationships aren't in the summary table
        $comboItems = ItemDetails::select(
            'item_details.product_code',
            'product.product_description as description',
            DB::raw('SUM(item_details.qty) as total_quantity'),
            DB::raw('SUM(item_details.net_total) as net_sales')
        )
        ->join('header', function ($join) use ($terminal) {
            $join->on('item_details.si_number', '=', 'header.si_number')
                 ->on('item_details.terminal_number', '=', 'header.terminal_number')
                 ->on('item_details.branch_name', '=', 'header.branch_name')
                 ->when($terminal !== 'ALL', function ($query) use ($terminal) { $query->where('header.terminal_number', $terminal); });
        })
        ->leftJoin('product', 'item_details.product_code', '=', 'product.product_code')
        ->where('item_details.combo_header', $item->product_code)
        ->whereBetween('header.date', [$startDate, $endDate]);
        
        if ($store !== 'ALL') {
            $comboItems->where('item_details.store_name', $store);
        }
        
        if ($branch !== 'ALL') {
            $comboItems->where('item_details.branch_name', $branch);
        }
        
        $comboItems = $comboItems->groupBy('item_details.product_code', 'product.product_description')
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
    
    return [
        'groupedResults' => $groupedResults,
        'results' => $results
    ];
}
    


    public function productMixCategoryAll(Request $request)
    {
        $startDate = $request->input('from_date');
        $endDate = $request->input('to_date');
        $branch = strtoupper($request->input('branch_id', 'ALL'));
        $category = strtoupper($request->input('category_code', 'ALL'));
        $store = strtoupper($request->input('concept_id', 'ALL')); // Changed from store_id to concept_id

        try {
            $query = ItemDetails::select([
                'category.category_code',
                'category.category_description',
                'item_details.product_code',
                'product.product_description',
                DB::raw('SUM(item_details.qty) as quantity'),
                DB::raw('SUM(item_details.net_total) as net_sales')
            ])
            ->join('header', function ($join) use ($terminal) {
                $join->on('item_details.si_number', '=', 'header.si_number')
                     ->on('item_details.terminal_number', '=', 'header.terminal_number')
                     ->on('item_details.branch_name', '=', 'header.branch_name')
                     ->when($terminal !== 'ALL', function ($query) use ($terminal) { $query->where('header.terminal_number', $terminal); });
            })
            ->join('product', 'item_details.product_code', '=', 'product.product_code')
            ->join('category', 'product.category_code', '=', 'category.category_code')
            ->whereBetween('header.date', [$startDate, $endDate])
            ->when($store !== 'ALL', function ($q) use ($store) {
                return $q->where('item_details.store_name', $store);
            })
            ->when($branch !== 'ALL', function ($q) use ($branch) {
                return $q->where('item_details.branch_name', $branch);
            })
            ->when($category !== 'ALL', function ($q) use ($category) {
                return $q->where('product.category_code', $category);
            })
            ->groupBy(
                'category.category_code',
                'category.category_description',
                'item_details.product_code',
                'product.product_description'
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
                $comboItems = ItemDetails::select(
                    'item_details.product_code',
                    'product.product_description as description',
                    DB::raw('SUM(item_details.qty) as total_quantity'),
                    DB::raw('SUM(item_details.net_total) as net_sales')
                )
                ->join('header', function ($join) use ($terminal) {
                    $join->on('item_details.si_number', '=', 'header.si_number')
                         ->on('item_details.terminal_number', '=', 'header.terminal_number')
                         ->on('item_details.branch_name', '=', 'header.branch_name')
                         ->when($terminal !== 'ALL', function ($query) use ($terminal) { $query->where('header.terminal_number', $terminal); });
                })
                ->leftJoin('product', 'item_details.product_code', '=', 'product.product_code')
                ->where('item_details.combo_header', $item->product_code)
                ->whereBetween('header.date', [$startDate, $endDate]);
                
                if ($store !== 'ALL') {
                    $comboItems->where('item_details.store_name', $store);
                }
                
                if ($branch !== 'ALL') {
                    $comboItems->where('item_details.branch_name', $branch);
                }
                
                $comboItems = $comboItems->groupBy('item_details.product_code', 'product.product_description')
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
                    'concept_id' => $store,
                    'category' => $category,
                    'terminal' => $terminal
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
            
            $query = ItemDetails::query()
                ->select(
                    DB::raw('DATE(header.date) as transaction_date'),
                    DB::raw('ROUND(SUM(senior_disc), 2) as senior_disc'),
                    DB::raw('ROUND(SUM(pwd_disc), 2) as pwd_disc'),
                    DB::raw('ROUND(SUM(other_disc), 2) as other_disc'),
                    DB::raw('ROUND(SUM(open_disc), 2) as open_disc'),
                    DB::raw('ROUND(SUM(employee_disc), 2) as employee_disc'),
                    DB::raw('ROUND(SUM(vip_disc), 2) as vip_disc'),
                    DB::raw('ROUND(SUM(promo), 2) as promo'),
                    DB::raw('ROUND(SUM(free), 2) as free')
                )
                ->join('header', function ($join) {
                    $join->on('item_details.si_number', '=', 'header.si_number')
                         ->on('item_details.terminal_number', '=', 'header.terminal_number')
                         ->on('item_details.branch_code', '=', 'header.branch_code');
                });

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
        $productMix = ItemDetails::select(
            'item_details.product_code',
            'product.product_description',
            DB::raw('SUM(item_details.qty) as total_quantity'),
            DB::raw('SUM(item_details.net_total) as total_net_sales')
        )
        ->join('header', function ($join) {
            $join->on('item_details.si_number', '=', 'header.si_number')
                 ->on('item_details.terminal_number', '=', 'header.terminal_number')
                 ->on('item_details.branch_name', '=', 'header.branch_name');
        })
        ->leftJoin('product', function($join) {
            $join->on('item_details.product_code', '=', 'product.product_code');
        })
        ->whereBetween('header.date', [$startDate, $endDate]);

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

        $productMix->groupBy('item_details.product_code', 'product.product_description')
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
            $comboItems = ItemDetails::select(
                'item_details.product_code',
                'product.product_description',
                DB::raw('SUM(item_details.qty) as total_quantity'),
                DB::raw('SUM(item_details.net_total) as net_sales')
            )
            ->join('header', function ($join) use ($terminal) {
                $join->on('item_details.si_number', '=', 'header.si_number')
                     ->on('item_details.terminal_number', '=', 'header.terminal_number')
                     ->on('item_details.branch_name', '=', 'header.branch_name');
            })
            ->leftJoin('product', function($join) {
                $join->on('item_details.product_code', '=', 'product.product_code');
            })
            ->where('item_details.combo_header', $item->product_code)
            ->whereBetween('header.date', [$startDate, $endDate]);
            
            if ($store !== 'ALL') {
                $comboItems->where('item_details.store_name', $store);
            }
            
            if ($branch !== 'ALL') {
                $comboItems->where('item_details.branch_name', $branch);
            }

            if ($terminal !== 'ALL') {
                $comboItems->where('item_details.terminal_number', $terminal);
            }
            
            $comboItems = $comboItems->groupBy('item_details.product_code', 'product.product_description')
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
