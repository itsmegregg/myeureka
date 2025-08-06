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
                    'from_date' => 'required|date',
                    'to_date' => 'required|date',
                    'terminal_number' => 'nullable|string',
                ]);

                if ($validator->fails()) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Validation failed',
                        'errors' => $validator->errors()
                    ], 422);
                }

                $query = DB::table('daily_summary as ds')
                    ->join('header as h', function ($join) {
                        $join->on('ds.terminal_no', '=', 'h.terminal_number')
                            ->on('ds.branch_name', '=', 'h.branch_name')
                            ->on('ds.store_name', '=', 'h.store_name')
                            ->on('ds.date', '=', 'h.date')
                        ->whereRaw('h.si_number >= ds.si_from AND h.si_number <= ds.si_to');
                })
                ->join('item_details as id', function ($join) {
                    $join->on('h.si_number', '=', 'id.si_number')
                        ->on('h.terminal_number', '=', 'id.terminal_number')
                        ->on('h.branch_name', '=', 'id.branch_name')
                        ->on('h.store_name', '=', 'id.store_name');
                })
                ->select(
                    'ds.branch_name AS Branch',
                    'ds.store_name AS Concept',
                    'ds.terminal_no AS Terminal',
                    'ds.date AS Date',
                    'ds.z_read_counter AS `Z Counter`',
                    'ds.si_from AS `SI First`',
                    'ds.si_to AS `SI Last`',
                    'ds.old_grand_total AS Beginning',
                    'ds.new_grand_total AS Ending',
                    DB::raw('CAST(SUM(h.net_amount) AS DECIMAL(10, 2)) AS `Net Amount`'),
                    DB::raw('CAST(SUM(h.service_charge) AS DECIMAL(10, 2)) AS `Service charge`'),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'DISABILITY' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS PWD"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'SENIOR' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS Senior"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'NACBIA' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS `NATIONAL ATHLETES`"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'SOLO PARENT' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS `SOLO PARENT`"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'VALOR' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS VALOR"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code NOT IN ('DISABILITY', 'SENIOR', 'NATIONAL ATHLETES', 'SOLO PARENT', 'VALOR', 'EMPLOYEE DISCOUNT') THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS `OTHER DISCOUNTS`"),
                    DB::raw('NULL AS Returns'),
                    DB::raw('CAST(SUM(id.void_amount) AS DECIMAL(10, 2)) AS Voids'),
                    DB::raw('CAST(SUM(h.gross_amount) AS DECIMAL(10, 2)) AS Gross'),
                    DB::raw('CAST(SUM(h.vatable_sales) AS DECIMAL(10, 2)) AS Vatable'),
                    DB::raw('CAST(SUM(h.vat_amount) AS DECIMAL(10, 2)) AS `VAT Amount`'),
                    DB::raw('CAST(SUM(h.vat_exempt_sales) AS DECIMAL(10, 2)) AS `VAT Exempt`'),
                    DB::raw('CAST(SUM(h.zero_rated_sales) AS DECIMAL(10, 2)) AS `Zero Rated`'),
                    DB::raw('CAST(SUM(h.less_vat) AS DECIMAL(10, 2)) AS `Less VAT`')
                )
                ->whereBetween('ds.date', [$request->from_date, $request->to_date]);

            if ($request->branch_name && strtoupper($request->branch_name) !== 'ALL') {
                $query->where('ds.branch_name', $request->branch_name);
            }

            if ($request->store_name && strtoupper($request->store_name) !== 'ALL') {
                $query->where('ds.store_name', $request->store_name);
            }

            if ($request->terminal_number && strtoupper($request->terminal_number) !== 'ALL') {
                $query->where('ds.terminal_no', $request->terminal_number);
            }

            $query->groupBy(
                'ds.id',
                'ds.branch_name',
                'ds.store_name',    
                'ds.terminal_no',
                'ds.date',
                'ds.z_read_counter',
                'ds.si_from',
                'ds.si_to',
                'ds.old_grand_total',
                'ds.new_grand_total'
            )
            ->orderBy('ds.date')
            ->orderBy('ds.branch_name')
            ->orderBy('ds.store_name')
            ->orderBy('ds.terminal_no');

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
                'from_date' => 'required|date',
                'to_date' => 'required|date',
                'terminal_number' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $query = DB::table('daily_summary as ds')
                ->join('header as h', function ($join) {
                    $join->on('ds.terminal_no', '=', 'h.terminal_number')
                        ->on('ds.branch_name', '=', 'h.branch_name')
                        ->on('ds.store_name', '=', 'h.store_name')
                        ->on('ds.date', '=', 'h.date')
                        ->whereRaw('h.si_number >= ds.si_from AND h.si_number <= ds.si_to');
                })
                ->join('item_details as id', function ($join) {
                    $join->on('h.si_number', '=', 'id.si_number')
                        ->on('h.terminal_number', '=', 'id.terminal_number')
                        ->on('h.branch_name', '=', 'id.branch_name')
                        ->on('h.store_name', '=', 'id.store_name');
                })
                ->select(
                    'ds.branch_name AS Branch',
                    'ds.store_name AS Concept',
                    'ds.terminal_no AS Terminal',
                    'ds.date AS Date',
                    'ds.z_read_counter AS `Z Counter`',
                    'ds.si_from AS `SI First`',
                    'ds.si_to AS `SI Last`',
                    'ds.old_grand_total AS Beginning',
                    'ds.new_grand_total AS Ending',
                    DB::raw('CAST(SUM(h.net_amount) AS DECIMAL(10, 2)) AS `Net Amount`'),
                    DB::raw('CAST(SUM(h.service_charge) AS DECIMAL(10, 2)) AS `Service charge`'),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'DISABILITY' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS PWD"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'SENIOR' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS Senior"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'NACBIA' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS `NATIONAL ATHLETES`"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'SOLO PARENT' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS `SOLO PARENT`"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code = 'VALOR' THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS VALOR"),
                    DB::raw("CAST(SUM(CASE WHEN id.discount_code NOT IN ('DISABILITY', 'SENIOR', 'NATIONAL ATHLETES', 'SOLO PARENT', 'VALOR', 'EMPLOYEE DISCOUNT') THEN id.discount_amount ELSE 0 END) AS DECIMAL(10, 2)) AS `OTHER DISCOUNTS`"),
                    DB::raw('NULL AS Returns'),
                    DB::raw('CAST(SUM(id.void_amount) AS DECIMAL(10, 2)) AS Voids'),
                    DB::raw('CAST(SUM(h.gross_amount) AS DECIMAL(10, 2)) AS Gross'),
                    DB::raw('CAST(SUM(h.vatable_sales) AS DECIMAL(10, 2)) AS Vatable'),
                    DB::raw('CAST(SUM(h.vat_amount) AS DECIMAL(10, 2)) AS `VAT Amount`'),
                    DB::raw('CAST(SUM(h.vat_exempt_sales) AS DECIMAL(10, 2)) AS `VAT Exempt`'),
                    DB::raw('CAST(SUM(h.zero_rated_sales) AS DECIMAL(10, 2)) AS `Zero Rated`'),
                    DB::raw('CAST(SUM(h.less_vat) AS DECIMAL(10, 2)) AS `Less VAT`')
                )
                ->whereBetween('ds.date', [$request->from_date, $request->to_date]);

            if ($request->branch_name && strtoupper($request->branch_name) !== 'ALL') {
                $query->where('ds.branch_name', $request->branch_name);
            }

            if ($request->store_name && strtoupper($request->store_name) !== 'ALL') {
                $query->where('ds.store_name', $request->store_name);
            }

            if ($request->terminal_number && strtoupper($request->terminal_number) !== 'ALL') {
                $query->where('ds.terminal_no', $request->terminal_number);
            }

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
                ->orderBy('ds.store_name')
                ->orderBy('ds.terminal_no');

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
