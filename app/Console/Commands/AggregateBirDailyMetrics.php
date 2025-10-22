<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AggregateBirDailyMetrics extends Command
{
    protected $signature = 'bir:aggregate-daily
        {--from= : Start date (Y-m-d)}
        {--to= : End date (Y-m-d, inclusive)}
        {--force : Rebuild metrics even if records already exist}
        {--branch= : Optional branch filter}
        {--store= : Optional store filter}
        {--terminal= : Optional terminal filter}';

    protected $description = 'Aggregate transactional data into bir_daily_metrics';

    public function handle(): int
    {
        $from = $this->option('from') ? Carbon::parse($this->option('from'))->startOfDay() : Carbon::yesterday();
        $to = $this->option('to') ? Carbon::parse($this->option('to'))->startOfDay() : $from;

        if ($from->greaterThan($to)) {
            $this->error('The --from date cannot be later than --to date.');
            return self::FAILURE;
        }

        $branch = $this->option('branch');
        $store = $this->option('store');
        $terminal = $this->option('terminal');
        $force = (bool) $this->option('force');

        $period = CarbonPeriod::create($from, $to);
        $this->info(sprintf('Aggregating BIR metrics from %s to %s%s%s%s',
            $from->toDateString(),
            $to->toDateString(),
            $branch ? " | branch={$branch}" : '',
            $store ? " | store={$store}" : '',
            $terminal ? " | terminal={$terminal}" : ''
        ));

        DB::beginTransaction();

        try {
            foreach ($period as $date) {
                $this->aggregateForDate($date, $branch, $store, $terminal, $force);
            }

            DB::commit();
        } catch (\Throwable $exception) {
            DB::rollBack();
            Log::error('Failed to aggregate BIR metrics', [
                'error' => $exception->getMessage(),
                'trace' => $exception->getTraceAsString(),
            ]);

            $this->error($exception->getMessage());
            return self::FAILURE;
        }

        $this->info('Aggregation completed successfully.');
        return self::SUCCESS;
    }

    private function aggregateForDate(Carbon $date, ?string $branch, ?string $store, ?string $terminal, bool $force): void
    {
        $existingQuery = DB::table('bir_daily_metrics')
            ->whereDate('business_date', $date->toDateString());

        if ($branch) {
            $existingQuery->where('branch_name', $branch);
        }

        if ($store) {
            $existingQuery->where('store_name', $store);
        }

        if ($terminal) {
            $existingQuery->where('terminal_no', $terminal);
        }

        $alreadyExists = $existingQuery->exists();

        if ($alreadyExists && !$force) {
            $this->line(sprintf('Skipping %s (exists)', $date->toDateString()));
            return;
        }

        if ($alreadyExists && $force) {
            $existingQuery->delete();
        }

        $metrics = $this->fetchAggregatedMetrics($date, $branch, $store, $terminal);

        if ($metrics->isEmpty()) {
            $this->line(sprintf('No data found for %s', $date->toDateString()));
            return;
        }

        $insertPayload = $metrics->map(function (array $row) use ($date) {
            return array_merge($row, [
                'business_date' => $date->toDateString(),
                'generated_at' => Carbon::now(),
                'source_start_date' => $date->toDateString(),
                'source_end_date' => $date->toDateString(),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        })->all();

        DB::table('bir_daily_metrics')->insert($insertPayload);

        $this->line(sprintf('Aggregated %d record(s) for %s', count($insertPayload), $date->toDateString()));
    }

    private function fetchAggregatedMetrics(Carbon $date, ?string $branch, ?string $store, ?string $terminal): Collection
    {
        $baseQuery = DB::table('daily_summary as ds')
            ->join('header as h', function ($join) {
                $join->on(DB::raw('TRIM(UPPER(ds.branch_name))'), '=', DB::raw('TRIM(UPPER(h.branch_name))'))
                    ->on(DB::raw('TRIM(UPPER(ds.store_name))'), '=', DB::raw('TRIM(UPPER(h.store_name))'))
                    ->on('ds.date', '=', 'h.date')
                    ->whereRaw('CAST(h.si_number AS NUMERIC) BETWEEN CAST(ds.si_from AS NUMERIC) AND CAST(ds.si_to AS NUMERIC)');
            })
            ->whereDate('ds.date', $date->toDateString())
            ->whereRaw("COALESCE(TRIM(h.void_flag), '0') = '0'");

        if ($branch) {
            $baseQuery->whereRaw('TRIM(UPPER(ds.branch_name)) = ?', [strtoupper(trim($branch))]);
        }

        if ($store) {
            $baseQuery->whereRaw('TRIM(UPPER(ds.store_name)) = ?', [strtoupper(trim($store))]);
        }

        if ($terminal) {
            $baseQuery->whereRaw('TRIM(UPPER(ds.terminal_no)) = ?', [strtoupper(trim($terminal))]);
        }

        $discounts = DB::table('item_details as id')
            ->join('header as h2', function ($join) {
                $join->on(DB::raw('CAST(h2.si_number AS NUMERIC)'), '=', DB::raw('CAST(id.si_number AS NUMERIC)'))
                    ->on(DB::raw('TRIM(UPPER(h2.branch_name))'), '=', DB::raw('TRIM(UPPER(id.branch_name))'))
                    ->on(DB::raw('TRIM(UPPER(h2.store_name))'), '=', DB::raw('TRIM(UPPER(id.store_name))'))
                    ->on(DB::raw('CAST(h2.terminal_number AS NUMERIC)'), '=', DB::raw('CAST(id.terminal_number AS NUMERIC)'));
            })
            ->whereDate('h2.date', $date->toDateString())
            ->whereRaw("COALESCE(TRIM(id.void_flag), '0') = '0'")
            ->when($branch, fn ($q) => $q->whereRaw('TRIM(UPPER(h2.branch_name)) = ?', [strtoupper(trim($branch))]))
            ->when($store, fn ($q) => $q->whereRaw('TRIM(UPPER(h2.store_name)) = ?', [strtoupper(trim($store))]))
            ->when($terminal, fn ($q) => $q->whereRaw('TRIM(UPPER(h2.terminal_number)) = ?', [strtoupper(trim($terminal))]))
            ->select(
                DB::raw('TRIM(UPPER(h2.branch_name)) as branch_name'),
                DB::raw('TRIM(UPPER(h2.store_name)) as store_name'),
                DB::raw('TRIM(UPPER(h2.terminal_number)) as terminal_no'),
                'id.discount_code',
                DB::raw('SUM(CAST(id.discount_amount AS NUMERIC)) as total_discount')
            )
            ->groupBy(
                DB::raw('TRIM(UPPER(h2.branch_name))'),
                DB::raw('TRIM(UPPER(h2.store_name))'),
                DB::raw('TRIM(UPPER(h2.terminal_number))'),
                'id.discount_code'
            )
            ->get();

        $payments = DB::table('payment_details as pd')
            ->join('header as h3', function ($join) {
                $join->on(DB::raw('CAST(h3.si_number AS NUMERIC)'), '=', DB::raw('CAST(pd.si_number AS NUMERIC)'))
                    ->on(DB::raw('TRIM(UPPER(h3.branch_name))'), '=', DB::raw('TRIM(UPPER(pd.branch_name))'))
                    ->on(DB::raw('TRIM(UPPER(h3.store_name))'), '=', DB::raw('TRIM(UPPER(pd.store_name))'));
            })
            ->whereDate('h3.date', $date->toDateString())
            ->whereRaw("COALESCE(TRIM(h3.void_flag), '0') = '0'")
            ->when($branch, fn ($q) => $q->whereRaw('TRIM(UPPER(h3.branch_name)) = ?', [strtoupper(trim($branch))]))
            ->when($store, fn ($q) => $q->whereRaw('TRIM(UPPER(h3.store_name)) = ?', [strtoupper(trim($store))]))
            ->when($terminal, fn ($q) => $q->whereRaw('TRIM(UPPER(h3.terminal_number)) = ?', [strtoupper(trim($terminal))]))
            ->select(
                DB::raw('TRIM(UPPER(h3.branch_name)) as branch_name'),
                DB::raw('TRIM(UPPER(h3.store_name)) as store_name'),
                DB::raw('TRIM(UPPER(h3.terminal_number)) as terminal_no'),
                DB::raw('SUM(CAST(pd.amount AS NUMERIC)) as total_amount'),
                DB::raw('TRIM(UPPER(pd.payment_type)) as payment_type')
            )
            ->groupBy(
                DB::raw('TRIM(UPPER(h3.branch_name))'),
                DB::raw('TRIM(UPPER(h3.store_name))'),
                DB::raw('TRIM(UPPER(h3.terminal_number))'),
                DB::raw('TRIM(UPPER(pd.payment_type))')
            )
            ->get();

        $voids = DB::table('item_details as id')
            ->join('header as h4', function ($join) {
                $join->on(DB::raw('CAST(h4.si_number AS NUMERIC)'), '=', DB::raw('CAST(id.si_number AS NUMERIC)'))
                    ->on(DB::raw('TRIM(UPPER(h4.branch_name))'), '=', DB::raw('TRIM(UPPER(id.branch_name))'))
                    ->on(DB::raw('TRIM(UPPER(h4.store_name))'), '=', DB::raw('TRIM(UPPER(id.store_name))'))
                    ->on(DB::raw('CAST(h4.terminal_number AS NUMERIC)'), '=', DB::raw('CAST(id.terminal_number AS NUMERIC)'));
            })
            ->whereDate('h4.date', $date->toDateString())
            ->whereRaw("COALESCE(TRIM(h4.void_flag), '0') = '0'")
            ->when($branch, fn ($q) => $q->whereRaw('TRIM(UPPER(h4.branch_name)) = ?', [strtoupper(trim($branch))]))
            ->when($store, fn ($q) => $q->whereRaw('TRIM(UPPER(h4.store_name)) = ?', [strtoupper(trim($store))]))
            ->when($terminal, fn ($q) => $q->whereRaw('TRIM(UPPER(h4.terminal_number)) = ?', [strtoupper(trim($terminal))]))
            ->select(
                DB::raw('TRIM(UPPER(h4.branch_name)) as branch_name'),
                DB::raw('TRIM(UPPER(h4.store_name)) as store_name'),
                DB::raw('TRIM(UPPER(h4.terminal_number)) as terminal_no'),
                DB::raw('SUM(CAST(id.void_amount AS NUMERIC)) as void_amount')
            )
            ->groupBy(
                DB::raw('TRIM(UPPER(h4.branch_name))'),
                DB::raw('TRIM(UPPER(h4.store_name))'),
                DB::raw('TRIM(UPPER(h4.terminal_number))')
            )
            ->get();

        $discountGrouped = $discounts
            ->groupBy(fn ($item) => $this->buildKey($item->branch_name, $item->store_name, $item->terminal_no))
            ->map(function (Collection $items) {
                return $items->groupBy('discount_code')
                    ->map(fn (Collection $rows) => (float) $rows->sum('total_discount'))
                    ->toArray();
            });

        $paymentGrouped = $payments
            ->groupBy(fn ($item) => $this->buildKey($item->branch_name, $item->store_name, $item->terminal_no))
            ->map(function (Collection $items) {
                return $items->groupBy('payment_type')
                    ->map(fn (Collection $rows) => (float) $rows->sum('total_amount'))
                    ->toArray();
            });

        $voidGrouped = $voids
            ->groupBy(fn ($item) => $this->buildKey($item->branch_name, $item->store_name, $item->terminal_no))
            ->map(fn (Collection $rows) => (float) $rows->sum('void_amount'));

        $rows = $baseQuery
            ->select([
                DB::raw('ds.branch_name'),
                DB::raw('ds.store_name'),
                DB::raw('ds.terminal_no'),
                DB::raw('ds.z_read_counter'),
                DB::raw('ds.si_from'),
                DB::raw('ds.si_to'),
                DB::raw('CAST(COALESCE(ds.old_grand_total, 0) AS NUMERIC(15,2)) as beginning'),
                DB::raw('CAST(COALESCE(ds.new_grand_total, 0) AS NUMERIC(15,2)) as ending'),
                DB::raw('CAST(SUM(CAST(h.net_amount AS NUMERIC)) AS NUMERIC(15,2)) as net_amount'),
                DB::raw('CAST(SUM(CAST(h.service_charge AS NUMERIC)) AS NUMERIC(15,2)) as service_charge'),
                DB::raw('CAST(SUM(CAST(h.delivery_charge AS NUMERIC)) AS NUMERIC(15,2)) as delivery_charge'),
                DB::raw('CAST(SUM(CAST(h.guest_count AS NUMERIC)) AS NUMERIC(10,2)) as total_guests'),
                DB::raw('CAST(SUM(CAST(h.gross_amount AS NUMERIC)) AS NUMERIC(15,2)) as gross_amount'),
                DB::raw('CAST(SUM(CAST(h.vatable_sales AS NUMERIC)) AS NUMERIC(15,2)) as vatable'),
                DB::raw('CAST(SUM(CAST(h.vat_amount AS NUMERIC)) AS NUMERIC(15,2)) as vat_amount'),
                DB::raw('CAST(SUM(CAST(h.vat_exempt_sales AS NUMERIC)) AS NUMERIC(15,2)) as vat_exempt'),
                DB::raw('CAST(SUM(CAST(h.zero_rated_sales AS NUMERIC)) AS NUMERIC(15,2)) as zero_rated'),
                DB::raw('CAST(SUM(CAST(h.less_vat AS NUMERIC)) AS NUMERIC(15,2)) as less_vat'),
            ])
            ->groupBy([
                'ds.branch_name',
                'ds.store_name',
                'ds.terminal_no',
                'ds.z_read_counter',
                'ds.si_from',
                'ds.si_to',
                'ds.old_grand_total',
                'ds.new_grand_total',
            ])
            ->get();

        if ($rows->isEmpty()) {
            return collect();
        }

        return $rows->map(function ($row) use ($discountGrouped, $paymentGrouped, $voidGrouped) {
            $key = $this->buildKey($row->branch_name, $row->store_name, $row->terminal_no);

            $discountBreakdown = $this->normalizeBreakdown($discountGrouped->get($key, []));
            $paymentBreakdown = $this->normalizeBreakdown($paymentGrouped->get($key, []));
            $voidAmount = $voidGrouped->get($key, 0.0);

            return [
                'branch_name' => $row->branch_name,
                'store_name' => $row->store_name,
                'terminal_no' => $row->terminal_no,
                'z_read_counter' => $row->z_read_counter,
                'si_from' => $row->si_from,
                'si_to' => $row->si_to,
                'beginning' => (float) $row->beginning,
                'ending' => (float) $row->ending,
                'net_amount' => (float) $row->net_amount,
                'service_charge' => (float) $row->service_charge,
                'delivery_charge' => (float) $row->delivery_charge,
                'total_guests' => (int) round((float) $row->total_guests),
                'gross_amount' => (float) $row->gross_amount,
                'vatable' => (float) $row->vatable,
                'vat_amount' => (float) $row->vat_amount,
                'vat_exempt' => (float) $row->vat_exempt,
                'zero_rated' => (float) $row->zero_rated,
                'less_vat' => (float) $row->less_vat,
                'void_amount' => $voidAmount,
                'discount_breakdown' => $this->encodeBreakdown($discountBreakdown),
                'payment_breakdown' => $this->encodeBreakdown($paymentBreakdown),
                'meta' => null,
            ];
        });
    }

    private function buildKey(?string $branch, ?string $store, ?string $terminal): string
    {
        return sprintf('%s|%s|%s',
            strtoupper(trim((string) $branch)),
            strtoupper(trim((string) $store)),
            strtoupper(trim((string) ($terminal ?? '')))
        );
    }

    private function normalizeBreakdown(array $values): array
    {
        $normalized = [];

        foreach ($values as $key => $value) {
            if ($key === null || $key === '') {
                continue;
            }

            $normalized[strtoupper(trim((string) $key))] = (float) $value;
        }

        return $normalized;
    }

    private function encodeBreakdown(array $values): ?string
    {
        if (empty($values)) {
            return null;
        }

        return json_encode($values);
    }
}
