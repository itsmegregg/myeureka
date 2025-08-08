<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class BIRSummaryController extends Controller
{
    public function getSummary(Request $request){
        try {
            $validator = Validator::make($request->all(), [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'from_date' => 'required|date_format:Y-m-d',
                'to_date' => 'required|date_format:Y-m-d',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $baseQuery = DB::table('daily_summary as ds')
                ->join('header as h', function ($join) {
                    $join->on('ds.branch_name', '=', 'h.branch_name')
                        ->on('ds.store_name', '=', 'h.store_name')
                        ->on('ds.date', '=', 'h.date')
                        ->whereRaw('h.si_number >= ds.si_from AND h.si_number <= ds.si_to');
                })
                ->join('item_details as id', function ($join) {
                    $join->on('h.si_number', '=', 'id.si_number')
                        ->on('h.branch_name', '=', 'id.branch_name')
                        ->on('h.store_name', '=', 'id.store_name');
                })
                ->whereBetween('ds.date', [$request->from_date, $request->to_date]);

            if ($request->branch_name && strtoupper($request->branch_name) !== 'ALL') {
                $baseQuery->where('ds.branch_name', $request->branch_name);
            }
            if ($request->store_name && strtoupper($request->store_name) !== 'ALL') {
                $baseQuery->where('ds.store_name', $request->store_name);
            }

            $discountCodes = (clone $baseQuery)
                ->select('id.discount_code')
                ->distinct()
                ->pluck('discount_code')
                ->filter(function($code){ return !is_null($code) && $code !== ''; })
                ->values();

            // Fetch distinct payment types using header join to respect date/branch/store filters
            $paymentTypes = DB::table('payment_details as pd')
                ->join('header as h2', function($join){
                    $join->on('h2.si_number', '=', 'pd.si_number')
                        ->on('h2.branch_name', '=', 'pd.branch_name')
                        ->on('h2.store_name', '=', 'pd.store_name');
                })
                ->whereBetween('h2.date', [$request->from_date, $request->to_date])
                ->when($request->branch_name && strtoupper($request->branch_name) !== 'ALL', function($q) use ($request){
                    $q->where('h2.branch_name', $request->branch_name);
                })
                ->when($request->store_name && strtoupper($request->store_name) !== 'ALL', function($q) use ($request){
                    $q->where('h2.store_name', $request->store_name);
                })
                ->select('pd.payment_type')
                ->distinct()
                ->pluck('payment_type')
                ->filter(function($t){ return !is_null($t) && $t !== ''; })
                ->values();

            $selects = [
                DB::raw('ds.branch_name AS "Branch"'),
                DB::raw('ds.store_name AS "Concept"'),
                DB::raw('ds.date AS "Date"'),
                DB::raw('ds.z_read_counter AS "Z Counter"'),
                DB::raw('ds.si_from AS "SI First"'),
                DB::raw('ds.si_to AS "SI Last"'),
                DB::raw('ds.old_grand_total AS "Beginning"'),
                DB::raw('ds.new_grand_total AS "Ending"'),
                DB::raw('CAST(SUM(CAST(h.net_amount AS NUMERIC)) AS NUMERIC(10, 2)) AS "Net Amount"'),
                DB::raw('CAST(SUM(CAST(h.service_charge AS NUMERIC)) AS NUMERIC(10, 2)) AS "Service charge"'),
                DB::raw('CAST(SUM(CAST(h.guest_count AS NUMERIC)) AS NUMERIC(10, 2)) AS "Total No of Guest"'),
            ];

            foreach ($discountCodes as $code) {
                $alias = strtoupper($code);
                $alias = str_replace('"', '""', $alias);
                $codeSql = str_replace("'", "''", $code);
                $selects[] = DB::raw(
                    "CAST(SUM(CASE WHEN id.discount_code = '".$codeSql."' THEN CAST(id.discount_amount AS NUMERIC) ELSE 0::NUMERIC END) AS NUMERIC(10, 2)) AS \"".$alias."\""
                );
            }

            // Add dynamic payment type columns using scalar subqueries to avoid row multiplication
            foreach ($paymentTypes as $ptype) {
                $alias = strtoupper($ptype);
                $alias = str_replace('"', '""', $alias);
                $ptypeSql = str_replace("'", "''", $ptype);
                $selects[] = DB::raw(
                    "(SELECT CAST(SUM(CAST(pd.amount AS NUMERIC)) AS NUMERIC(10, 2))\n                      FROM payment_details pd\n                      JOIN header h2 ON h2.si_number = pd.si_number\n                                   AND h2.branch_name = pd.branch_name\n                                   AND h2.store_name = pd.store_name\n                      WHERE h2.branch_name = ds.branch_name\n                        AND h2.store_name = ds.store_name\n                        AND h2.date = ds.date\n                        AND h2.si_number >= ds.si_from\n                        AND h2.si_number <= ds.si_to\n                        AND pd.payment_type = '".$ptypeSql."') AS \"".$alias."\""
                );
            }

            $selects = array_merge($selects, [
                DB::raw("NULL AS \"Returns\""),
                DB::raw('CAST(SUM(CAST(id.void_amount AS NUMERIC)) AS NUMERIC(10, 2)) AS "Voids"'),
                DB::raw('CAST(SUM(CAST(h.gross_amount AS NUMERIC)) AS NUMERIC(10, 2)) AS "Gross"'),
                DB::raw('CAST(SUM(CAST(h.vatable_sales AS NUMERIC)) AS NUMERIC(10, 2)) AS "Vatable"'),
                DB::raw('CAST(SUM(CAST(h.vat_amount AS NUMERIC)) AS NUMERIC(10, 2)) AS "VAT Amount"'),
                DB::raw('CAST(SUM(CAST(h.vat_exempt_sales AS NUMERIC)) AS NUMERIC(10, 2)) AS "VAT Exempt"'),
                DB::raw('CAST(SUM(CAST(h.zero_rated_sales AS NUMERIC)) AS NUMERIC(10, 2)) AS "Zero Rated"'),
                DB::raw('CAST(SUM(CAST(h.less_vat AS NUMERIC)) AS NUMERIC(10, 2)) AS "Less VAT"'),
            ]);

            $query = $baseQuery->select($selects);

            $query->groupBy(
                'ds.id',
                'ds.branch_name',
                'ds.store_name',
                'ds.date',
                'ds.z_read_counter',
                'ds.si_from',
                'ds.si_to',
                'ds.old_grand_total',
                'ds.new_grand_total'
            )
            ->orderBy('ds.date')
            ->orderBy('ds.branch_name')
            ->orderBy('ds.store_name');

            $summaryData = $query->get();

            return response()->json([
                'status' => 'success',
                'data' => $summaryData
            ]);

        } catch (\Throwable $th) {
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred',
                'error' => $th->getMessage()
            ], 500);
        }
    }

    public function exportSummary(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'from_date' => 'required|date_format:Y-m-d',
                'to_date' => 'required|date_format:Y-m-d',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $baseQuery = DB::table('daily_summary as ds')
                ->join('header as h', function ($join) {
                    $join->on('ds.branch_name', '=', 'h.branch_name')
                        ->on('ds.store_name', '=', 'h.store_name')
                        ->on('ds.date', '=', 'h.date')
                        ->whereRaw('h.si_number >= ds.si_from AND h.si_number <= ds.si_to');
                })
                ->join('item_details as id', function ($join) {
                    $join->on('h.si_number', '=', 'id.si_number')
                        ->on('h.branch_name', '=', 'id.branch_name')
                        ->on('h.store_name', '=', 'id.store_name');
                })
                ->whereBetween('ds.date', [$request->from_date, $request->to_date]);

            if ($request->branch_name && strtoupper($request->branch_name) !== 'ALL') {
                $baseQuery->where('ds.branch_name', $request->branch_name);
            }
            if ($request->store_name && strtoupper($request->store_name) !== 'ALL') {
                $baseQuery->where('ds.store_name', $request->store_name);
            }

            $discountCodes = (clone $baseQuery)
                ->select('id.discount_code')
                ->distinct()
                ->pluck('discount_code')
                ->filter(function($code){ return !is_null($code) && $code !== ''; })
                ->values();

            // Build dynamic select list for export
            $selects = [
                DB::raw('ds.branch_name AS "Branch"'),
                DB::raw('ds.store_name AS "Concept"'),
                DB::raw('ds.date AS "Date"'),
                DB::raw('ds.z_read_counter AS "Z Counter"'),
                DB::raw('ds.si_from AS "SI First"'),
                DB::raw('ds.si_to AS "SI Last"'),
                DB::raw('ds.old_grand_total AS "Beginning"'),
                DB::raw('ds.new_grand_total AS "Ending"'),
                DB::raw('CAST(SUM(CAST(h.net_amount AS NUMERIC)) AS NUMERIC(10, 2)) AS "Net Amount"'),
                DB::raw('CAST(SUM(CAST(h.service_charge AS NUMERIC)) AS NUMERIC(10, 2)) AS "Service charge"'),
                DB::raw('CAST(SUM(CAST(h.guest_count AS NUMERIC)) AS NUMERIC(10, 2)) AS "Total No of Guest"'),
            ];

            foreach ($discountCodes as $code) {
                $alias = strtoupper($code);
                $alias = str_replace('"', '""', $alias); // escape in alias
                $codeSql = str_replace("'", "''", $code); // escape literal
                $selects[] = DB::raw(
                    "CAST(SUM(CASE WHEN id.discount_code = '".$codeSql."' THEN CAST(id.discount_amount AS NUMERIC) ELSE 0::NUMERIC END) AS NUMERIC(10, 2)) AS \"".$alias."\""
                );
            }

            // Append dynamic payment type columns via scalar subqueries
            foreach ($paymentTypes as $ptype) {
                $alias = strtoupper($ptype);
                $alias = str_replace('"', '""', $alias);
                $ptypeSql = str_replace("'", "''", $ptype);
                $selects[] = DB::raw(
                    "(SELECT CAST(SUM(CAST(pd.amount AS NUMERIC)) AS NUMERIC(10, 2))\n                      FROM payment_details pd\n                      JOIN header h2 ON h2.si_number = pd.si_number\n                                   AND h2.branch_name = pd.branch_name\n                                   AND h2.store_name = pd.store_name\n                      WHERE h2.branch_name = ds.branch_name\n                        AND h2.store_name = ds.store_name\n                        AND h2.date = ds.date\n                        AND h2.si_number >= ds.si_from\n                        AND h2.si_number <= ds.si_to\n                        AND pd.payment_type = '".$ptypeSql."') AS \"".$alias."\""
                );
            }

            $selects = array_merge($selects, [
                DB::raw("NULL AS \"Returns\""),
                DB::raw('CAST(SUM(CAST(id.void_amount AS NUMERIC)) AS NUMERIC(10, 2)) AS "Voids"'),
                DB::raw('CAST(SUM(CAST(h.gross_amount AS NUMERIC)) AS NUMERIC(10, 2)) AS "Gross"'),
                DB::raw('CAST(SUM(CAST(h.vatable_sales AS NUMERIC)) AS NUMERIC(10, 2)) AS "Vatable"'),
                DB::raw('CAST(SUM(CAST(h.vat_amount AS NUMERIC)) AS NUMERIC(10, 2)) AS "VAT Amount"'),
                DB::raw('CAST(SUM(CAST(h.vat_exempt_sales AS NUMERIC)) AS NUMERIC(10, 2)) AS "VAT Exempt"'),
                DB::raw('CAST(SUM(CAST(h.zero_rated_sales AS NUMERIC)) AS NUMERIC(10, 2)) AS "Zero Rated"'),
                DB::raw('CAST(SUM(CAST(h.less_vat AS NUMERIC)) AS NUMERIC(10, 2)) AS "Less VAT"'),
            ]);

            $query = $baseQuery->select($selects);

            $query->groupBy(
                'ds.id',
                'ds.branch_name',
                'ds.store_name',
                'ds.date',
                'ds.z_read_counter',
                'ds.si_from',
                'ds.si_to',
                'ds.old_grand_total',
                'ds.new_grand_total'
            )
            ->orderBy('ds.date')
            ->orderBy('ds.branch_name')
            ->orderBy('ds.store_name');

            $summaryData = $query->get();

            return response()->json([
                'status' => 'success',
                'data' => $summaryData
            ]);

        } catch (\Throwable $th) {
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred',
                'error' => $th->getMessage()
            ], 500);
        }
    }
}
