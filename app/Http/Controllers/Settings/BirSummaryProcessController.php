<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Throwable;

class BirSummaryProcessController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date'],
            'branch_name' => ['nullable', 'string'],
            'store_name' => ['nullable', 'string'],
            'terminal_number' => ['nullable', 'string'],
            'force' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $from = Carbon::parse($request->input('from_date'))->startOfDay();
            $to = Carbon::parse($request->input('to_date'))->startOfDay();

            if ($from->greaterThan($to)) {
                return response()->json([
                    'success' => false,
                    'message' => 'The from date must be earlier than or equal to the to date.',
                ], 422);
            }

            $options = [
                '--from' => $from->toDateString(),
                '--to' => $to->toDateString(),
            ];

            $branch = $request->input('branch_name');
            if ($branch && strtoupper($branch) !== 'ALL') {
                $options['--branch'] = $branch;
            }

            $store = $request->input('store_name');
            if ($store && strtoupper($store) !== 'ALL') {
                $options['--store'] = $store;
            }

            $terminal = $request->input('terminal_number');
            if ($terminal && strtoupper($terminal) !== 'ALL') {
                $options['--terminal'] = $terminal;
            }

            $force = $request->boolean('force');

            if (!$force && $this->hasExistingMetrics($from, $to, $branch, $store, $terminal)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Existing BIR daily metrics detected for the selected range. Re-run with force enabled to refresh the stored data.',
                    'data' => [
                        'options' => $options,
                    ],
                ], 409);
            }

            if ($force) {
                $this->deleteExistingMetrics($from, $to, $branch, $store, $terminal);
            }

            $exitCode = Artisan::call('bir:aggregate-daily', $options);
            $output = Artisan::output();

            return response()->json([
                'success' => $exitCode === 0,
                'message' => $exitCode === 0
                    ? 'BIR daily metrics aggregation completed successfully.'
                    : 'BIR daily metrics aggregation encountered an error.',
                'data' => [
                    'exit_code' => $exitCode,
                    'output' => $output,
                    'options' => $options,
                ],
            ], $exitCode === 0 ? 200 : 500);
        } catch (Throwable $throwable) {
            Log::error('Failed to run bir:aggregate-daily command', [
                'error' => $throwable->getMessage(),
                'trace' => $throwable->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred while aggregating BIR metrics.',
            ], 500);
        }
    }

    private function deleteExistingMetrics(Carbon $from, Carbon $to, ?string $branch, ?string $store, ?string $terminal): void
    {
        $query = $this->buildMetricsQuery($from, $to, $branch, $store, $terminal);

        $deleted = $query->delete();

        Log::info('bir_daily_metrics force refresh: deleted existing records', [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'branch' => $branch,
            'store' => $store,
            'terminal' => $terminal,
            'deleted_count' => $deleted,
        ]);
    }

    private function hasExistingMetrics(Carbon $from, Carbon $to, ?string $branch, ?string $store, ?string $terminal): bool
    {
        return $this->buildMetricsQuery($from, $to, $branch, $store, $terminal)->exists();
    }

    private function buildMetricsQuery(Carbon $from, Carbon $to, ?string $branch, ?string $store, ?string $terminal)
    {
        $query = DB::table('bir_daily_metrics')
            ->whereBetween('business_date', [$from->toDateString(), $to->toDateString()]);

        if ($branch && strtoupper($branch) !== 'ALL') {
            $query->whereRaw('TRIM(UPPER(branch_name)) = ?', [strtoupper(trim($branch))]);
        }

        if ($store && strtoupper($store) !== 'ALL') {
            $query->whereRaw('TRIM(UPPER(store_name)) = ?', [strtoupper(trim($store))]);
        }

        if ($terminal && strtoupper($terminal) !== 'ALL') {
            $query->whereRaw('TRIM(UPPER(terminal_no)) = ?', [strtoupper(trim($terminal))]);
        }

        return $query;
    }
}
