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
    public function index(Request $request)
    {
        try {
            // Normalize inputs
            $input = [
                'branch_name' => is_string($request->branch_name) ? trim($request->branch_name) : $request->branch_name,
                'store_name' => is_string($request->store_name) ? trim($request->store_name) : $request->store_name,
                'payment_type' => is_string($request->payment_type) ? trim($request->payment_type) : $request->payment_type,
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
                'per_page' => $request->per_page,
                'page' => $request->page,
            ];

            // Validate the request strictly
            $validator = Validator::make($input, [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'payment_type' => 'nullable|string',
                'from_date' => 'required|date_format:Y-m-d',
                'to_date' => 'required|date_format:Y-m-d',
                'per_page' => 'nullable|integer|min:1',
                'page' => 'nullable|integer|min:1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Build WHERE and bindings (PostgreSQL friendly)
            $where = ['date BETWEEN ? AND ?'];
            $bindings = [$input['from_date'], $input['to_date']];

            if (!empty($input['branch_name']) && strtoupper($input['branch_name']) !== 'ALL') {
                $where[] = 'branch_name = ?';
                $bindings[] = $input['branch_name'];
            }

            if (!empty($input['store_name']) && strtoupper($input['store_name']) !== 'ALL') {
                $where[] = 'store_name = ?';
                $bindings[] = $input['store_name'];
            }

            if (!empty($input['payment_type']) && strtoupper($input['payment_type']) !== 'ALL') {
                // Match exact token inside comma-separated field using Postgres string pattern
                $where[] = "((',' || payment_type || ',') LIKE ? OR payment_type = ?)";
                $bindings[] = '%,' . $input['payment_type'] . ',%';
                $bindings[] = $input['payment_type'];
            }

            $whereSql = implode(' AND ', $where);
            $orderSql = 'ORDER BY date ASC, si_number ASC';

            // Pagination
            $perPage = max(1, (int)($input['per_page'] ?? 15));
            $page = max(1, (int)($input['page'] ?? 1));
            $offset = ($page - 1) * $perPage;

            // Total count
            $countSql = "SELECT COUNT(*) AS cnt FROM bir_detailed WHERE $whereSql";
            $totalRow = DB::selectOne($countSql, $bindings);
            $total = $totalRow ? (int)$totalRow->cnt : 0;

            // Data query
            $sql = "SELECT branch_name, store_name, date, si_number, vat_exempt_sales, zero_rated_sales, vat_amount, less_vat, gross_amount, discount_code, discount_amount, net_total, payment_type, amount
                    FROM bir_detailed
                    WHERE $whereSql
                    $orderSql
                    LIMIT ? OFFSET ?";
            $dataBindings = array_merge($bindings, [$perPage, $offset]);
            $rows = DB::select($sql, $dataBindings);

            // Transform rows
            $data = collect($rows)->map(function ($item) {
                return [
                    'branch_name' => $item->branch_name,
                    'store_name' => $item->store_name,
                    'date' => \Carbon\Carbon::parse($item->date)->format('Y-m-d'),
                    'si_number' => $item->si_number,
                    'vat_exempt_sales' => (float) $item->vat_exempt_sales,
                    'zero_rated_sales' => (float) $item->zero_rated_sales,
                    'vat_amount' => (float) $item->vat_amount,
                    'less_vat' => (float) $item->less_vat,
                    'gross_amount' => (float) $item->gross_amount,
                    'discount_code' => $item->discount_code,
                    'discount_amount' => (float) $item->discount_amount,
                    'net_total' => (float) $item->net_total,
                    'payment_type' => $item->payment_type,
                    'amount' => (float) $item->amount
                ];
            });

            // Pagination meta
            $lastPage = (int) ceil($total / $perPage);
            return response()->json([
                'status' => 'success',
                'data' => $data,
                'meta' => [
                    'current_page' => $page,
                    'from' => $total === 0 ? null : ($offset + 1),
                    'last_page' => $lastPage,
                    'path' => url()->current(),
                    'per_page' => $perPage,
                    'to' => $total === 0 ? null : (min($offset + $perPage, $total)),
                    'total' => $total,
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('BIR Detailed index failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'inputs' => $request->all(),
            ]);
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch BIR detailed data.'
            ], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            // Normalize inputs
            $input = [
                'branch_name' => is_string($request->branch_name) ? trim($request->branch_name) : $request->branch_name,
                'store_name' => is_string($request->store_name) ? trim($request->store_name) : $request->store_name,
                'payment_type' => is_string($request->payment_type) ? trim($request->payment_type) : $request->payment_type,
                'from_date' => $request->from_date,
                'to_date' => $request->to_date,
            ];

            $validator = Validator::make($input, [
                'branch_name' => 'nullable|string',
                'store_name' => 'nullable|string',
                'payment_type' => 'nullable|string',
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

            // Build WHERE and bindings
            $where = ['date BETWEEN ? AND ?'];
            $bindings = [$input['from_date'], $input['to_date']];

            if (!empty($input['branch_name']) && strtoupper($input['branch_name']) !== 'ALL') {
                $where[] = 'branch_name = ?';
                $bindings[] = $input['branch_name'];
            }

            if (!empty($input['store_name']) && strtoupper($input['store_name']) !== 'ALL') {
                $where[] = 'store_name = ?';
                $bindings[] = $input['store_name'];
            }

            if (!empty($input['payment_type']) && strtoupper($input['payment_type']) !== 'ALL') {
                $where[] = "((',' || payment_type || ',') LIKE ? OR payment_type = ?)";
                $bindings[] = '%,' . $input['payment_type'] . ',%';
                $bindings[] = $input['payment_type'];
            }

            $whereSql = implode(' AND ', $where);
            $sql = "SELECT branch_name, store_name, date, si_number, vat_exempt_sales, zero_rated_sales, vat_amount, less_vat, gross_amount, discount_code, discount_amount, net_total, payment_type, amount
                    FROM bir_detailed
                    WHERE $whereSql
                    ORDER BY date ASC, si_number ASC";

            $rows = DB::select($sql, $bindings);

            // Transform the data to maintain consistency with frontend expectations
            $data = collect($rows)->map(function ($item) {
                return [
                    'branch_name' => $item->branch_name,
                    'store_name' => $item->store_name,
                    'date' => \Carbon\Carbon::parse($item->date)->format('Y-m-d'),
                    'si_number' => $item->si_number,
                    'vat_exempt_sales' => (float) $item->vat_exempt_sales,
                    'zero_rated_sales' => (float) $item->zero_rated_sales,
                    'vat_amount' => (float) $item->vat_amount,
                    'less_vat' => (float) $item->less_vat,
                    'gross_amount' => (float) $item->gross_amount,
                    'discount_code' => $item->discount_code,
                    'discount_amount' => (float) $item->discount_amount,
                    'net_total' => (float) $item->net_total,
                    'payment_type' => $item->payment_type,
                    'amount' => (float) $item->amount
                ];
            });

            // Return all data without pagination metadata
            return response()->json([
                'status' => 'success',
                'data' => $data
            ]);

        } catch (\Exception $e) {
            \Log::error('BIR Detailed export failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'inputs' => $request->all(),
            ]);
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch BIR detailed data for export.'
            ], 500);
        }
    }
}
