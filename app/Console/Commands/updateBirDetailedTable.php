<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

class UpdateBirDetailedTable extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bir-detailed:update {date? : Date to update in Y-m-d format} {--all : Update all dates} {--previous : Update previous date} {--start= : Start date for range update (YYYY-MM-DD format)} {--end= : End date for range update (YYYY-MM-DD format)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update BIR Detailed summary table for faster reporting. Supports single date, date range, or all dates.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Check if all flag is set
        if ($this->option('all')) {
            return $this->updateAllDates();
        }

        // Check if date range is provided
        if ($this->option('start') || $this->option('end')) {
            return $this->updateDateRange();
        }

        // Check if previous flag is set
        if ($this->option('previous')) {
            $date = Carbon::yesterday()->format('Y-m-d');
            return $this->updateSingleDate($date);
        }

        // Get date from argument or use yesterday
        $date = $this->argument('date') ? $this->argument('date') : Carbon::yesterday()->format('Y-m-d');
        
        return $this->updateSingleDate($date);
    }

    /**
     * Update summary table for a single date.
     *
     * @param string $date
     * @return int
     */
    protected function updateSingleDate($date)
    {
        $this->info("Processing BIR Detailed data for date: {$date}");
        
        try {
            // Start a transaction for data integrity
            DB::beginTransaction();
            
            // Delete existing records for this date
            DB::table('bir_detailed')
                ->where('date', $date)
                ->delete();
            
            // Insert new records from the source tables
            $affected = DB::insert("
                INSERT INTO bir_detailed (
                    date, branch_name, store_name, terminal_number, si_number, 
                    vat_exempt_sales, zero_rated_sales, vat_amount, less_vat, gross_amount,
                    discount_code, discount_amount, net_total, payment_type, amount,
                    service_charge, delivery_charge
                )
                SELECT
                    h.date,
                    h.branch_name,
                    h.store_name,
                    h.terminal_number,
                    h.si_number,
                    CAST(h.vat_exempt_sales AS NUMERIC(10, 2)),
                    CAST(h.zero_rated_sales AS NUMERIC(10, 2)),
                    CAST(h.vat_amount AS NUMERIC(10, 2)),
                    CAST(h.less_vat AS NUMERIC(10, 2)),
                    CAST(h.gross_amount AS NUMERIC(10, 2)),
                    tis.applied_discount_codes,
                    COALESCE(tis.total_item_discount_amount, 0),
                    COALESCE(tis.total_item_net_sales, 0),
                    pts.combined_payment_types,
                    CAST(h.net_amount AS NUMERIC(10, 2)),
                    CAST(COALESCE(CAST(h.service_charge AS NUMERIC), 0) AS NUMERIC(10, 2)),
                    CAST(COALESCE(CAST(h.delivery_charge AS NUMERIC), 0) AS NUMERIC(10, 2))
                FROM header as h
                LEFT JOIN (
                    SELECT
                        id.si_number,
                        id.terminal_number,
                        id.branch_name,
                        id.store_name,
                        SUM(CAST(id.discount_amount AS NUMERIC(10, 2))) AS total_item_discount_amount,
                        STRING_AGG(DISTINCT CAST(id.discount_code AS TEXT), ', ') AS applied_discount_codes,
                        SUM(CAST(id.net_total AS NUMERIC(10, 2))) AS total_item_net_sales
                    FROM
                        item_details AS id
                    WHERE
                        id.void_flag = '0'
                    GROUP BY
                        id.si_number,
                        id.terminal_number,
                        id.branch_name,
                        id.store_name
                ) AS tis ON h.si_number = tis.si_number 
                   AND h.terminal_number = tis.terminal_number 
                   AND h.branch_name = tis.branch_name 
                   AND h.store_name = tis.store_name
                LEFT JOIN (
                    SELECT
                        pd.si_number,
                        pd.terminal_number,
                        pd.branch_name,
                        pd.store_name,
                        STRING_AGG(DISTINCT CAST(pd.payment_type AS TEXT), ', ') AS combined_payment_types
                    FROM
                        payment_details AS pd
                    GROUP BY
                        pd.si_number,
                        pd.terminal_number,
                        pd.branch_name,
                        pd.store_name
                ) AS pts ON h.si_number = pts.si_number 
                   AND h.terminal_number = pts.terminal_number 
                   AND h.branch_name = pts.branch_name 
                   AND h.store_name = pts.store_name
                WHERE h.void_flag = '0' AND h.date = ?
            ", [$date]);
            
            // Commit the transaction
            DB::commit();
            
            $this->info("Successfully updated BIR Detailed data for date: {$date}");
            
            return 0;
        } catch (Exception $e) {
            // Rollback on error
            DB::rollBack();
            
            $this->error("Error processing date {$date}: " . $e->getMessage());
            return 1;
        }
    }

    /**
     * Update a date range in the BIR detailed table
     *
     * @return int
     */
    protected function updateDateRange()
    {
        $startDate = $this->option('start');
        $endDate = $this->option('end');
        
        // Validate date range inputs
        if (!$startDate && !$endDate) {
            $this->error('Please provide at least one of --start or --end options for date range update.');
            return 1;
        }
        
        // Set defaults if only one date is provided
        if (!$startDate) {
            $startDate = Carbon::parse($endDate)->subDays(30)->format('Y-m-d'); // Default to 30 days before end date
            $this->info("Start date not provided. Using: {$startDate} (30 days before end date)");
        }
        
        if (!$endDate) {
            $endDate = Carbon::now()->format('Y-m-d'); // Default to today
            $this->info("End date not provided. Using: {$endDate} (today)");
        }
        
        // Validate date formats
        try {
            $startCarbon = Carbon::createFromFormat('Y-m-d', $startDate);
            $endCarbon = Carbon::createFromFormat('Y-m-d', $endDate);
        } catch (\Exception $e) {
            $this->error('Invalid date format. Please use YYYY-MM-DD format.');
            return 1;
        }
        
        // Validate date range
        if ($startCarbon->gt($endCarbon)) {
            $this->error('Start date cannot be later than end date.');
            return 1;
        }
        
        $this->info("Updating BIR Detailed table for date range: {$startDate} to {$endDate}");
        
        // Get all dates within the range that exist in the header table
        $dates = DB::table('header')
            ->select('date')
            ->distinct()
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date')
            ->pluck('date')
            ->toArray();
            
        $totalDates = count($dates);
        
        if ($totalDates === 0) {
            $this->warn("No data found in the date range {$startDate} to {$endDate}. Skipping update.");
            return 0;
        }
        
        $this->info("Found {$totalDates} dates to process in the specified range.");
        
        // Create progress bar
        $bar = $this->output->createProgressBar($totalDates);
        $bar->start();
        
        $successCount = 0;
        $errorCount = 0;
        
        // Process each date in the range
        foreach ($dates as $date) {
            try {
                // Start a transaction for data integrity
                DB::beginTransaction();
                
                // Delete existing records for this date
                DB::table('bir_detailed')
                    ->where('date', $date)
                    ->delete();
                
                // Insert new records from the source tables (using the same query as updateSingleDate)
                DB::insert("
                    INSERT INTO bir_detailed (
                        date, branch_name, store_name, terminal_number, si_number, 
                        vat_exempt_sales, zero_rated_sales, vat_amount, less_vat, gross_amount,
                        discount_code, discount_amount, net_total, payment_type, amount,
                        service_charge, delivery_charge
                    )
                    SELECT
                        h.date,
                        h.branch_name,
                        h.store_name,
                        h.terminal_number,
                        h.si_number,
                        CAST(h.vat_exempt_sales AS NUMERIC(10, 2)),
                        CAST(h.zero_rated_sales AS NUMERIC(10, 2)),
                        CAST(h.vat_amount AS NUMERIC(10, 2)),
                        CAST(h.less_vat AS NUMERIC(10, 2)),
                        CAST(h.gross_amount AS NUMERIC(10, 2)),
                        tis.applied_discount_codes,
                        COALESCE(tis.total_item_discount_amount, 0),
                        COALESCE(tis.total_item_net_sales, 0),
                        pts.combined_payment_types,
                        CAST(h.net_amount AS NUMERIC(10, 2)),
                        CAST(COALESCE(CAST(h.service_charge AS NUMERIC), 0) AS NUMERIC(10, 2)),
                        CAST(COALESCE(CAST(h.delivery_charge AS NUMERIC), 0) AS NUMERIC(10, 2))
                    FROM header as h
                    LEFT JOIN (
                        SELECT
                            id.si_number,
                            id.terminal_number,
                            id.branch_name,
                            id.store_name,
                            SUM(CAST(id.discount_amount AS NUMERIC(10, 2))) AS total_item_discount_amount,
                            STRING_AGG(DISTINCT CAST(id.discount_code AS TEXT), ', ') AS applied_discount_codes,
                            SUM(CAST(id.net_total AS NUMERIC(10, 2))) AS total_item_net_sales
                        FROM
                            item_details AS id
                        WHERE
                            id.void_flag = '0'
                        GROUP BY
                            id.si_number,
                            id.terminal_number,
                            id.branch_name,
                            id.store_name
                    ) AS tis ON h.si_number = tis.si_number 
                       AND h.terminal_number = tis.terminal_number 
                       AND h.branch_name = tis.branch_name 
                       AND h.store_name = tis.store_name
                    LEFT JOIN (
                        SELECT
                            pd.si_number,
                            pd.terminal_number,
                            pd.branch_name,
                            pd.store_name,
                            STRING_AGG(DISTINCT CAST(pd.payment_type AS TEXT), ', ') AS combined_payment_types
                        FROM
                            payment_details AS pd
                        GROUP BY
                            pd.si_number,
                            pd.terminal_number,
                            pd.branch_name,
                            pd.store_name
                    ) AS pts ON h.si_number = pts.si_number 
                       AND h.terminal_number = pts.terminal_number 
                       AND h.branch_name = pts.branch_name 
                       AND h.store_name = pts.store_name
                    WHERE h.void_flag = '0' AND h.date = ?
                ", [$date]);
                
                // Commit the transaction
                DB::commit();
                $successCount++;
            } catch (Exception $e) {
                // Rollback on error
                DB::rollBack();
                $errorCount++;
                // Don't display error immediately to avoid cluttering the progress bar
            }
            
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine();
        
        $this->info("Date range update completed for {$startDate} to {$endDate}.");
        $this->info("Successfully processed: {$successCount} dates");
        
        if ($errorCount > 0) {
            $this->warn("Failed to process: {$errorCount} dates");
        }
        
        return 0;
    }

    /**
     * Update summary table for all available dates.
     *
     * @return int
     */
    protected function updateAllDates()
    {
        $this->info("Updating BIR Detailed data for all dates");
        
        if (!$this->confirm('This will delete and regenerate all BIR Detailed summary data. Continue?', true)) {
            $this->info('Operation cancelled.');
            return 0;
        }
        
        try {
            // Get all unique dates from the header table
            $dates = DB::table('header')
                ->select('date')
                ->distinct()
                ->orderBy('date')
                ->pluck('date')
                ->toArray();
            
            // Delete all existing records
            DB::table('bir_detailed')->truncate();
            
            // Show progress bar
            $bar = $this->output->createProgressBar(count($dates));
            $bar->start();
            
            $successCount = 0;
            $errorCount = 0;
            
            foreach ($dates as $date) {
                try {
                    $this->updateSingleDate($date);
                    $successCount++;
                } catch (Exception $e) {
                    $errorCount++;
                    $this->newLine();
                    $this->error("Error processing date {$date}: " . $e->getMessage());
                }
                
                $bar->advance();
            }
            
            $bar->finish();
            $this->newLine();
            $this->info("BIR Detailed data update completed: {$successCount} dates processed successfully, {$errorCount} failed.");
            
            return 0;
        } catch (Exception $e) {
            $this->error("Error updating all dates: " . $e->getMessage());
            return 1;
        }
    }
}