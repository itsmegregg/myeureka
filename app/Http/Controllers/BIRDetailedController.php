<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use App\Models\BirDetailed; // Model for the bir_detailed summary table
use App\Http\Resources\BirDetailedCollection;
use Illuminate\Pagination\LengthAwarePaginator;

class BIRDetailedController extends Controller
{
    public function newBIRDetailedTable(Request $request)
    {
        try {
            $validated = $request->validate([
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'payment_type' => 'nullable|string',
                'from_date' => 'required|date_format:Y-m-d',
                'to_date' => 'required|date_format:Y-m-d',
                'page' => 'nullable|integer|min:1',
                'per_page' => 'nullable|integer|min:1|max:200'
            ]);

            $branch_name = $validated['branch_name'] ?? 'ALL';
            $store_name = $validated['store_name'] ?? 'ALL';
            $from_date = $validated['from_date'];
            $to_date = $validated['to_date'];

            // Build the query without terminal filtering
            $query = DB::table('header as h')
                ->select([
                    'h.date',
                    'h.branch_name',
                    'h.store_name',
                    'h.terminal_number',
                    'h.si_number',
                    DB::raw('CAST(h.vat_exempt_sales AS NUMERIC(10, 2)) as vat_exempt_sales'),
                    DB::raw('CAST(h.zero_rated_sales AS NUMERIC(10, 2)) as zero_rated_sales'),
                    DB::raw('CAST(h.vat_amount AS NUMERIC(10, 2)) as vat_amount'),
                    DB::raw('CAST(h.less_vat AS NUMERIC(10, 2)) as less_vat'),
                    DB::raw('CAST(h.gross_amount AS NUMERIC(10, 2)) as gross_amount'),
                    DB::raw('CAST(h.net_amount AS NUMERIC(10, 2)) as amount'),
                    DB::raw('CAST(COALESCE(CAST(h.service_charge AS NUMERIC), 0) AS NUMERIC(10, 2)) as service_charge'),
                    DB::raw('CAST(COALESCE(CAST(h.delivery_charge AS NUMERIC), 0) AS NUMERIC(10, 2)) as delivery_charge'),
                    DB::raw('CAST(((CAST(h.gross_amount AS NUMERIC) - (COALESCE(CAST(h.vat_exempt_sales AS NUMERIC), 0) + COALESCE(CAST(h.less_vat AS NUMERIC), 0) + COALESCE(CAST(h.zero_rated_sales AS NUMERIC), 0))) / 1.12) AS NUMERIC(10, 2)) as vatable_amount'),
                    DB::raw("COALESCE(tis.applied_discount_codes, '') as discount_code"),
                    DB::raw('COALESCE(tis.total_item_discount_amount, 0) as discount_amount'),
                    DB::raw('COALESCE(tis.total_item_net_sales, 0) as net_total'),
                    DB::raw("COALESCE(pts.combined_payment_types, '') as payment_type")
                ])
                ->leftJoin(DB::raw('(
                    SELECT
                        NULLIF(REGEXP_REPLACE(id.si_number::text, \'[^0-9]\', \'\', \'g\'), \'\')::numeric AS si_number,
                        NULLIF(REGEXP_REPLACE(id.terminal_number::text, \'[^0-9]\', \'\', \'g\'), \'\')::numeric AS terminal_number,
                        TRIM(UPPER(id.branch_name)) AS branch_name,
                        TRIM(UPPER(id.store_name)) AS store_name,
                        STRING_AGG(DISTINCT CAST(id.discount_code AS TEXT), \' , \' ) AS applied_discount_codes,
                        SUM(CAST(id.discount_amount AS NUMERIC(10, 2))) AS total_item_discount_amount,
                        SUM(CAST(id.net_total AS NUMERIC(10, 2))) AS total_item_net_sales
                    FROM item_details AS id
                    WHERE id.void_flag = \'0\'
                    GROUP BY
                        NULLIF(REGEXP_REPLACE(id.si_number::text, \'[^0-9]\', \'\', \'g\'), \'\')::numeric,
                        NULLIF(REGEXP_REPLACE(id.terminal_number::text, \'[^0-9]\', \'\', \'g\'), \'\')::numeric,
                        TRIM(UPPER(id.branch_name)),
                        TRIM(UPPER(id.store_name))
                ) AS tis'), function($join) {
                    $join->on(DB::raw("NULLIF(REGEXP_REPLACE(h.si_number::text, '[^0-9]', '', 'g'), '')::numeric"), '=', 'tis.si_number')
                        ->on(DB::raw("NULLIF(REGEXP_REPLACE(h.terminal_number::text, '[^0-9]', '', 'g'), '')::numeric"), '=', 'tis.terminal_number')
                        ->on(DB::raw('TRIM(UPPER(h.branch_name))'), '=', 'tis.branch_name')
                        ->on(DB::raw('TRIM(UPPER(h.store_name))'), '=', 'tis.store_name');
                })
                ->leftJoin(DB::raw('(
                    SELECT
                        NULLIF(REGEXP_REPLACE(pd.si_number::text, \'[^0-9]\', \'\', \'g\'), \'\')::numeric AS si_number,
                        NULLIF(REGEXP_REPLACE(pd.terminal_number::text, \'[^0-9]\', \'\', \'g\'), \'\')::numeric AS terminal_number,
                        TRIM(UPPER(pd.branch_name)) AS branch_name,
                        TRIM(UPPER(pd.store_name)) AS store_name,
                        STRING_AGG(DISTINCT CAST(pd.payment_type AS TEXT), \' , \' ) AS combined_payment_types
                    FROM payment_details AS pd
                    GROUP BY
                        NULLIF(REGEXP_REPLACE(pd.si_number::text, \'[^0-9]\', \'\', \'g\'), \'\')::numeric,
                        NULLIF(REGEXP_REPLACE(pd.terminal_number::text, \'[^0-9]\', \'\', \'g\'), \'\')::numeric,
                        TRIM(UPPER(pd.branch_name)),
                        TRIM(UPPER(pd.store_name))
                ) AS pts'), function($join) {
                    $join->on(DB::raw("NULLIF(REGEXP_REPLACE(h.si_number::text, '[^0-9]', '', 'g'), '')::numeric"), '=', 'pts.si_number')
                        ->on(DB::raw('TRIM(UPPER(h.branch_name))'), '=', 'pts.branch_name')
                        ->on(DB::raw('TRIM(UPPER(h.store_name))'), '=', 'pts.store_name')
                        ->on(DB::raw("NULLIF(REGEXP_REPLACE(h.terminal_number::text, '[^0-9]', '', 'g'), '')::numeric"), '=', 'pts.terminal_number');
                })
                ->where('h.void_flag', '0');

            // Apply filters
            if ($from_date && $to_date) {
                $query->whereBetween('h.date', [$from_date, $to_date]);
            }

            if ($branch_name !== 'ALL' && $branch_name !== null) {
                $query->whereRaw('TRIM(UPPER(h.branch_name)) = ?', [strtoupper(trim($branch_name))]);
            }

            if ($store_name !== 'ALL' && $store_name !== null) {
                $query->whereRaw('TRIM(UPPER(h.store_name)) = ?', [strtoupper(trim($store_name))]);
            }

            // Optional filter: payment_type
            if ($request->filled('payment_type') && strtoupper((string)$request->input('payment_type')) !== 'ALL') {
                $paymentType = $request->input('payment_type');
                $query->whereExists(function($q) use ($paymentType) {
                    $q->select(DB::raw(1))
                      ->from('payment_details as pd')
                      ->whereRaw(
                          "NULLIF(REGEXP_REPLACE(pd.si_number::text, '[^0-9]', '', 'g'), '')::numeric = NULLIF(REGEXP_REPLACE(h.si_number::text, '[^0-9]', '', 'g'), '')::numeric"
                      )
                      ->whereRaw(
                          "NULLIF(REGEXP_REPLACE(pd.terminal_number::text, '[^0-9]', '', 'g'), '')::numeric = NULLIF(REGEXP_REPLACE(h.terminal_number::text, '[^0-9]', '', 'g'), '')::numeric"
                      )
                      ->whereRaw('TRIM(UPPER(pd.branch_name)) = TRIM(UPPER(h.branch_name))')
                      ->whereRaw('TRIM(UPPER(pd.store_name)) = TRIM(UPPER(h.store_name))')
                      ->whereRaw('LOWER(pd.payment_type) = LOWER(?)', [$paymentType]);
                });
            }

            // Order by date
            $query->orderBy('h.date');

            // Pagination (default 30 per page)
            $perPage = (int) ($request->input('per_page', 10));
            $paginator = $query->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $paginator->items(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'from' => $paginator->firstItem(),
                    'last_page' => $paginator->lastPage(),
                    'path' => $request->url(),
                    'per_page' => $paginator->perPage(),
                    'to' => $paginator->lastItem(),
                    'total' => $paginator->total(),
                ],
            ]);

        } catch (\Exception $e) {
            \Log::error('New BIR Detailed fetch failed', [
                'error' => $e->getMessage(),
                'inputs' => $request->all(),
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch BIR detailed data.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
