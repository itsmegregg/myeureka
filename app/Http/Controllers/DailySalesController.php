<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Exception;

class DailySalesController extends Controller
{
     public function getDailySalesData(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'branch_name' => 'nullable|string',
            'store_name' => 'nullable|string',
            'terminal_number' => 'nullable|string',
            'from_date' => 'required|date',
            'to_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $branch = strtoupper($request->input('branch_name', 'ALL'));
        $store = strtoupper($request->input('store_name', 'ALL'));
        $terminal = strtoupper($request->input('terminal_number', 'ALL'));

        try {
            $query = DB::table('daily_summary as ds')
                ->select([
                    'ds.branch_name',
                    'ds.store_name',
                    'ds.terminal_no',
                    'ds.date',
                    DB::raw('CAST(COALESCE(ds.si_from, \'0\') AS INTEGER) as si_from'),
                    DB::raw('CAST(COALESCE(ds.si_to, \'0\') AS INTEGER) as si_to'),
                    'ds.z_read_counter',
                    DB::raw('CAST(COALESCE(ds.old_grand_total, \'0\') AS NUMERIC(15,2)) as old_grand_total'),
                    DB::raw('CAST(COALESCE(ds.new_grand_total, \'0\') AS NUMERIC(15,2)) as new_grand_total'),
                    DB::raw('COALESCE(h_agg.gross_sales, 0) as total_gross_sales'),
                    DB::raw('COALESCE(pd_agg.total_payment_amount, 0) as total_net_sales_after_void'),
                    DB::raw('(CAST(COALESCE(ds.si_to, \'0\') AS INTEGER) - CAST(COALESCE(ds.si_from, \'0\') AS INTEGER) + 1) as number_of_transactions'),
                    DB::raw('COALESCE(h_agg.guest_count, 0) as number_of_guests'),
                    DB::raw('COALESCE(h_agg.service_charge, 0) as total_service_charge'),
                    DB::raw('COALESCE(id_agg.void_amount, 0) as total_void_amount'),
                    DB::raw('COALESCE(h_agg.less_vat, 0) as less_vat'),
                    DB::raw('COALESCE(id_agg.pwd_discount, 0) as "PWD_Discount"'),
                    DB::raw('COALESCE(id_agg.senior_discount, 0) as "Senior_Discount"'),
                    DB::raw('COALESCE(id_agg.national_athletes_discount, 0) as "National_Athletes_Discount"'),
                    DB::raw('COALESCE(id_agg.solo_parent_discount, 0) as "Solo_Parent_Discount"'),
                    DB::raw('COALESCE(id_agg.valor_discount, 0) as "Valor_Discount"'),
                    DB::raw('COALESCE(id_agg.other_discounts, 0) as "Other_Discounts"'),
                ])
                ->leftJoin(DB::raw('(
                    SELECT
                        h.date,
                        h.branch_name,
                        h.store_name,
                        h.terminal_number,
                        SUM(CASE WHEN h.void_flag = \'0\' THEN CAST(h.gross_amount AS NUMERIC(15,2)) ELSE 0 END) as gross_sales,
                        SUM(CASE WHEN h.void_flag = \'0\' THEN CAST(h.service_charge AS NUMERIC(15,2)) ELSE 0 END) as service_charge,
                        SUM(CASE WHEN h.void_flag = \'0\' THEN CAST(h.less_vat AS NUMERIC(15,2)) ELSE 0 END) as less_vat,
                        SUM(CASE WHEN h.void_flag = \'0\' THEN CAST(h.net_amount AS NUMERIC(15,2)) ELSE 0 END) as net_amount,
                        SUM(CASE WHEN h.void_flag = \'0\' THEN CAST(h.guest_count AS INTEGER) ELSE 0 END) as guest_count
                    FROM header h
                    GROUP BY h.date, h.branch_name, h.store_name, h.terminal_number
                ) as h_agg'), function ($join) {
                    $join->on('ds.date', '=', 'h_agg.date')
                        ->on('ds.branch_name', '=', 'h_agg.branch_name')
                        ->on('ds.store_name', '=', 'h_agg.store_name')
                        ->on('ds.terminal_no', '=', 'h_agg.terminal_number');
                })
                ->leftJoin(DB::raw('(
                    SELECT
                        h.date,
                        h.branch_name,
                        h.store_name,
                        h.terminal_number,
                        COALESCE(SUM(CASE WHEN COALESCE(TRIM(id.void_flag), \'0\') = \'1\' THEN CAST(id.void_amount AS NUMERIC(15,2)) ELSE 0 END), 0) as void_amount,
                        COALESCE(SUM(CASE WHEN TRIM(UPPER(id.discount_code)) = \'DISABILITY\' THEN CAST(id.discount_amount AS NUMERIC(15,2)) ELSE 0 END), 0) as pwd_discount,
                        COALESCE(SUM(CASE WHEN TRIM(UPPER(id.discount_code)) = \'SENIOR\' THEN CAST(id.discount_amount AS NUMERIC(15,2)) ELSE 0 END), 0) as senior_discount,
                        COALESCE(SUM(CASE WHEN TRIM(UPPER(id.discount_code)) IN (\'NATIONAL ATHLETES\', \'ATHLETES\', \'COACH\', \'ATHLETE/COACH\') THEN CAST(id.discount_amount AS NUMERIC(15,2)) ELSE 0 END), 0) as national_athletes_discount,
                        COALESCE(SUM(CASE WHEN TRIM(UPPER(id.discount_code)) = \'SOLO PARENT\' THEN CAST(id.discount_amount AS NUMERIC(15,2)) ELSE 0 END), 0) as solo_parent_discount,
                        COALESCE(SUM(CASE WHEN TRIM(UPPER(id.discount_code)) = \'VALOR\' THEN CAST(id.discount_amount AS NUMERIC(15,2)) ELSE 0 END), 0) as valor_discount,
                        COALESCE(SUM(CASE WHEN TRIM(UPPER(id.discount_code)) NOT IN (\'DISABILITY\', \'SENIOR\', \'NATIONAL ATHLETES\', \'ATHLETES\', \'COACH\', \'ATHLETE/COACH\', \'SOLO PARENT\', \'VALOR\') THEN CAST(id.discount_amount AS NUMERIC(15,2)) ELSE 0 END), 0) as other_discounts
                    FROM header h
                    JOIN item_details id
                        ON TRIM(UPPER(h.branch_name)) = TRIM(UPPER(id.branch_name))
                        AND TRIM(UPPER(h.store_name)) = TRIM(UPPER(id.store_name))
                        AND CAST(h.terminal_number AS NUMERIC) = CAST(id.terminal_number AS NUMERIC)
                        AND CAST(h.si_number AS NUMERIC) = CAST(id.si_number AS NUMERIC)
                    WHERE COALESCE(TRIM(h.void_flag), \'0\') = \'0\'
                    GROUP BY h.date, h.branch_name, h.store_name, h.terminal_number
                ) as id_agg'), function ($join) {
                    $join->on('ds.date', '=', 'id_agg.date')
                        ->on(DB::raw('TRIM(UPPER(ds.branch_name))'), '=', DB::raw('TRIM(UPPER(id_agg.branch_name))'))
                        ->on(DB::raw('TRIM(UPPER(ds.store_name))'), '=', DB::raw('TRIM(UPPER(id_agg.store_name))'))
                        ->on(DB::raw('CAST(ds.terminal_no AS NUMERIC)'), '=', DB::raw('CAST(id_agg.terminal_number AS NUMERIC)'));
                })
                ->leftJoin(DB::raw(<<<SQL
(
    SELECT
        h.date,
        TRIM(UPPER(h.branch_name)) as branch_name,
        TRIM(UPPER(h.store_name)) as store_name,
        TRIM(UPPER(h.terminal_number)) as terminal_number,
        SUM(CAST(pd.amount AS NUMERIC(15,2))) as total_payment_amount
    FROM header h
    JOIN payment_details pd
        ON CAST(h.si_number AS NUMERIC) = CAST(pd.si_number AS NUMERIC)
        AND TRIM(UPPER(h.branch_name)) = TRIM(UPPER(pd.branch_name))
        AND TRIM(UPPER(h.store_name)) = TRIM(UPPER(pd.store_name))
        AND TRIM(UPPER(h.terminal_number)) = TRIM(UPPER(pd.terminal_number))
    WHERE COALESCE(TRIM(h.void_flag), '0') = '0'
    GROUP BY h.date, h.branch_name, h.store_name, h.terminal_number
) as pd_agg
SQL
), function ($join) {
                    $join->on('ds.date', '=', 'pd_agg.date')
                        ->on(DB::raw('TRIM(UPPER(ds.branch_name))'), '=', 'pd_agg.branch_name')
                        ->on(DB::raw('TRIM(UPPER(ds.store_name))'), '=', 'pd_agg.store_name')
                        ->on(DB::raw('TRIM(UPPER(ds.terminal_no))'), '=', 'pd_agg.terminal_number');
                })
                ->whereBetween('ds.date', [$fromDate, $toDate])
                ->when($branch !== 'ALL', fn ($q) => $q->whereRaw('UPPER(ds.branch_name) = ?', [$branch]))
                ->when($store !== 'ALL', fn ($q) => $q->whereRaw('UPPER(ds.store_name) = ?', [$store]))
                ->when($terminal !== 'ALL', fn ($q) => $q->whereRaw('UPPER(ds.terminal_no) = ?', [$terminal]));

            $results = $query
                ->groupBy(
                    'ds.branch_name',
                    'ds.store_name',
                    'ds.terminal_no',
                    'ds.date',
                    'ds.si_from',
                    'ds.si_to',
                    'ds.z_read_counter',
                    'ds.old_grand_total',
                    'ds.new_grand_total',
                    'h_agg.gross_sales',
                    'h_agg.service_charge',
                    'h_agg.net_amount',
                    'h_agg.less_vat',
                    'h_agg.guest_count',
                    'id_agg.void_amount',
                    'id_agg.pwd_discount',
                    'id_agg.senior_discount',
                    'id_agg.national_athletes_discount',
                    'id_agg.solo_parent_discount',
                    'id_agg.valor_discount',
                    'id_agg.other_discounts',
                    'pd_agg.total_payment_amount'
                )
                ->orderBy('ds.branch_name')
                ->orderBy('ds.date')
                ->orderBy('ds.store_name')
                ->orderBy('ds.terminal_no')
                ->get();

            $grandTotals = [
                'total_gross_sales' => 0.0,
                'total_net_sales_after_void' => 0.0,
                'total_service_charge' => 0.0,
                'total_void_amount' => 0.0,
                'number_of_transactions' => 0,
                'number_of_guests' => 0,
                'PWD_Discount' => 0.0,
                'Senior_Discount' => 0.0,
                'National_Athletes_Discount' => 0.0,
                'Solo_Parent_Discount' => 0.0,
                'Valor_Discount' => 0.0,
                'Other_Discounts' => 0.0,
                'less_vat' => 0.0,
            ];

            foreach ($results as $row) {
                $grandTotals['total_gross_sales'] += (float) $row->total_gross_sales;
                $grandTotals['total_net_sales_after_void'] += (float) $row->total_net_sales_after_void;
                $grandTotals['total_service_charge'] += (float) $row->total_service_charge;
                $grandTotals['total_void_amount'] += (float) $row->total_void_amount;
                $grandTotals['number_of_transactions'] += (int) $row->number_of_transactions;
                $grandTotals['number_of_guests'] += (int) $row->number_of_guests;
                $grandTotals['PWD_Discount'] += (float) $row->PWD_Discount;
                $grandTotals['Senior_Discount'] += (float) $row->Senior_Discount;
                $grandTotals['National_Athletes_Discount'] += (float) $row->National_Athletes_Discount;
                $grandTotals['Solo_Parent_Discount'] += (float) $row->Solo_Parent_Discount;
                $grandTotals['Valor_Discount'] += (float) $row->Valor_Discount;
                $grandTotals['Other_Discounts'] += (float) $row->Other_Discounts;
                $grandTotals['less_vat'] += (float) $row->less_vat;
            }

            $grandTotals = array_merge($grandTotals, [
                'total_gross_sales' => round($grandTotals['total_gross_sales'], 2),
                'total_net_sales_after_void' => round($grandTotals['total_net_sales_after_void'], 2),
                'total_service_charge' => round($grandTotals['total_service_charge'], 2),
                'total_void_amount' => round($grandTotals['total_void_amount'], 2),
                'PWD_Discount' => round($grandTotals['PWD_Discount'], 2),
                'Senior_Discount' => round($grandTotals['Senior_Discount'], 2),
                'National_Athletes_Discount' => round($grandTotals['National_Athletes_Discount'], 2),
                'Solo_Parent_Discount' => round($grandTotals['Solo_Parent_Discount'], 2),
                'Valor_Discount' => round($grandTotals['Valor_Discount'], 2),
                'Other_Discounts' => round($grandTotals['Other_Discounts'], 2),
                'less_vat' => round($grandTotals['less_vat'], 2),
            ]);

            return response()->json([
                'status' => 'success',
                'data' => $results,
                'grand_totals' => $grandTotals,
            ]);
        } catch (Exception $exception) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch daily sales data',
                'error' => $exception->getMessage(),
            ], 500);
        }
    }
}
