<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ItemDetail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PromoController extends Controller
{
    public function fetchPromoDetails(Request $request): JsonResponse
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
        $branchName = $this->normalizeFilter($request->input('branch_name'));
        $storeName = $this->normalizeFilter($request->input('store_name'));
        $terminalNumber = $this->normalizeFilter($request->input('terminal_number'));

        $query = ItemDetail::query()
            ->select([
                'item_details.branch_name',
                'item_details.store_name',
                'item_details.terminal_number',
                'item_details.si_number',
                'item_details.line_no',
                'item_details.product_code',
                'item_details.description',
                'item_details.combo_header',
                'item_details.qty',
                'item_details.menu_price',
                'item_details.net_total',
                DB::raw('header.date as transaction_date'),
            ])
            ->join('header', function ($join) {
                $join->on(DB::raw('CAST(item_details.si_number AS BIGINT)'), '=', DB::raw('CAST(header.si_number AS BIGINT)'))
                    ->on(DB::raw('item_details.terminal_number::integer'), '=', DB::raw('header.terminal_number::integer'))
                    ->on(DB::raw('UPPER(item_details.branch_name)'), '=', DB::raw('UPPER(header.branch_name)'))
                    ->on(DB::raw('UPPER(item_details.store_name)'), '=', DB::raw('UPPER(header.store_name)'));
            })
            ->whereBetween('header.date', [$fromDate, $toDate])
            ->whereRaw("COALESCE(item_details.void_flag, '0') = '0'");

        if ($branchName !== null) {
            $query->whereRaw('UPPER(item_details.branch_name) = ?', [$branchName]);
        }

        if ($storeName !== null) {
            $query->whereRaw('UPPER(item_details.store_name) = ?', [$storeName]);
        }

        if ($terminalNumber !== null) {
            $query->whereRaw('UPPER(item_details.terminal_number) = ?', [$terminalNumber]);
        }

        $promoLines = $query
            ->orderBy('item_details.si_number')
            ->orderBy('item_details.line_no')
            ->get();

        $lines = $promoLines->map(function ($line) {
            return [
                'transaction_date' => $line->transaction_date,
                'branch_name' => $line->branch_name,
                'store_name' => $line->store_name,
                'terminal_number' => $line->terminal_number,
                'si_number' => str_pad((string) $line->si_number, 6, '0', STR_PAD_LEFT),
                'line_no' => (int) $line->line_no,
                'product_code' => $line->product_code,
                'description' => $line->description,
                'combo_header' => $line->combo_header,
                'qty' => (int) $line->qty,
                'unit_price' => $line->menu_price !== null ? (float) $line->menu_price : 0.0,
                'amount' => $line->net_total !== null ? (float) $line->net_total : 0.0,
            ];
        });

        $summaries = $promoLines
            ->filter(static function ($line) {
                return !empty($line->combo_header);
            })
            ->groupBy(static function ($line) {
                return $line->si_number . '|' . $line->combo_header;
            })
            ->map(static function ($group, $key) use ($promoLines) {
                [$siNumber, $comboHeader] = explode('|', $key, 2);

                $totalQty = $group->sum(static fn ($item) => (int) $item->qty);
                $totalAmount = $group->sum(static fn ($item) => (float) ($item->net_total ?? 0));

                $relatedLines = $promoLines->filter(static function ($lineItem) use ($siNumber, $comboHeader) {
                    if ((string) $lineItem->si_number !== $siNumber) {
                        return false;
                    }

                    $hasMatchingProduct = $lineItem->product_code === $comboHeader;
                    $isRootLine = empty($lineItem->combo_header);

                    return $hasMatchingProduct && $isRootLine;
                });

                if ($relatedLines->isNotEmpty()) {
                    $totalQty = max($totalQty, (int) $relatedLines->sum(static fn ($item) => (int) $item->qty));
                    $totalAmount = $relatedLines->sum(static fn ($item) => (float) ($item->net_total ?? 0));
                }

                return [
                    'si_number' => str_pad((string) $siNumber, 6, '0', STR_PAD_LEFT),
                    'combo_header' => $comboHeader,
                    'description' => $group->first()->description,
                    'total_qty' => $totalQty,
                    'total_amount' => $totalAmount,
                ];
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'lines' => $lines,
                'summaries' => $summaries,
            ],
            'filters' => [
                'branch_name' => $branchName ?? 'ALL',
                'store_name' => $storeName ?? 'ALL',
                'terminal_number' => $terminalNumber ?? 'ALL',
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
        ]);
    }

    private function normalizeFilter(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = strtoupper(trim($value));

        return $normalized === 'ALL' ? null : $normalized;
    }
}
