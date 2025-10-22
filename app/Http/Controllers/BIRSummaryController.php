<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Carbon\Carbon;
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

            $summaryData = $this->fetchSummary($request);

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

            $summaryData = $this->fetchSummary($request, true);

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

    private function fetchSummary(Request $request, bool $forExport = false)
    {
        $fromDate = Carbon::createFromFormat('Y-m-d', $request->from_date)->startOfDay();
        $toDate = Carbon::createFromFormat('Y-m-d', $request->to_date)->endOfDay();

        $query = DB::table('bir_daily_metrics')
            ->whereBetween('business_date', [$fromDate, $toDate]);

        if ($request->branch_name && strtoupper($request->branch_name) !== 'ALL') {
            $query->where('branch_name', $request->branch_name);
        }

        if ($request->store_name && strtoupper($request->store_name) !== 'ALL') {
            $query->where('store_name', $request->store_name);
        }

        $rows = $query
            ->orderBy('business_date')
            ->orderBy('branch_name')
            ->orderBy('store_name')
            ->orderBy('terminal_no')
            ->get();

        if ($rows->isEmpty()) {
            return collect();
        }

        return $rows->map(function ($row) use ($forExport) {
            $discounts = $this->decodeBreakdown($row->discount_breakdown);
            $payments = $this->decodeBreakdown($row->payment_breakdown);

            $base = [
                'Branch' => $row->branch_name,
                'Concept' => $row->store_name,
                'Date' => $row->business_date,
                'Z Counter' => $row->z_read_counter,
                'SI First' => $row->si_from,
                'SI Last' => $row->si_to,
                'Beginning' => $row->beginning,
                'Ending' => $row->ending,
                'Net Amount' => $row->net_amount,
                'Service charge' => $row->service_charge,
                'Total Sales' => (float) ($row->net_amount ?? 0) + (float) ($row->service_charge ?? 0),
                'Delivery Charge' => $row->delivery_charge,
                'Total No of Guest' => $row->total_guests,
                'Voids' => $row->void_amount,
                'Gross' => $row->gross_amount,
                'Vatable' => $row->vatable,
                'VAT Amount' => $row->vat_amount,
                'VAT Exempt' => $row->vat_exempt,
                'Zero Rated' => $row->zero_rated,
                'Less VAT' => $row->less_vat,
            ];

            $dynamic = [];

            if (!empty($discounts)) {
                foreach ($discounts as $code => $amount) {
                    $dynamic[$code] = $amount;
                }
            }

            if (!empty($payments)) {
                foreach ($payments as $type => $amount) {
                    $dynamic[$type] = $amount;
                }
            }

            return array_merge($base, $dynamic);
        });
    }

    private function decodeBreakdown(?string $payload): array
    {
        if (!$payload) {
            return [];
        }

        $decoded = json_decode($payload, true);

        if (!is_array($decoded)) {
            return [];
        }

        return $decoded;
    }
}
