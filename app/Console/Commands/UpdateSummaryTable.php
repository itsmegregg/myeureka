<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class UpdateSummaryTable extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'summary:update {date? : Date to update (YYYY-MM-DD format, defaults to yesterday)}
                           {--all : Update all dates from the entire history}
                           {--start= : Start date for range update (YYYY-MM-DD format)}
                           {--end= : End date for range update (YYYY-MM-DD format)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update the item_details_daily_summary table with aggregated data. Supports single date, date range, or all dates.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Check if --all flag is provided
        if ($this->option('all')) {
            return $this->updateAllDates();
        }
        
        // Check if date range is provided
        if ($this->option('start') || $this->option('end')) {
            return $this->updateDateRange();
        }
        
        // Otherwise process single date
        $date = $this->argument('date') ?? Carbon::yesterday()->format('Y-m-d');
        return $this->updateSingleDate($date);
    }
    
    /**
     * Update a single date in the summary table
     */
    protected function updateSingleDate($date)
    {
        $this->info("Updating summary table for date: {$date}");
        
        // Check if data exists for this date
        $hasData = DB::table('header')->where('date', $date)->exists();
        
        if (!$hasData) {
            $this->warn("No data found for {$date} in the header table. Skipping update.");
            return 0;
        }
        
        // Begin transaction
        DB::beginTransaction();
        
        try {
            // Pre-insert diagnostic: how many groups would be inserted for this date?
            $diag = DB::selectOne("
                SELECT COUNT(*) AS cnt FROM (
                    SELECT 
                        h.date,
                        id.branch_name,
                        id.store_name,
                        id.category_code,
                        id.product_code
                    FROM 
                        item_details id
                    JOIN header h ON id.si_number = h.si_number 
                                  AND id.terminal_number = h.terminal_number 
                                  AND id.branch_name = h.branch_name
                                  AND id.store_name = h.store_name
                    LEFT JOIN products p ON id.product_code = p.product_code
                                        AND p.branch_name = id.branch_name
                                        AND p.store_name = id.store_name
                    WHERE h.date = ?
                    GROUP BY 
                        h.date,
                        id.branch_name, 
                        id.store_name,
                        id.category_code,
                        id.product_code
                ) s
            ", [$date]);
            $this->info("[Diag] Groups to insert for {$date}: " . ((array)$diag)['cnt']);

            // Delete existing records for this date (to handle updates)
            DB::table('item_details_daily_summary')
                ->where('date', $date)
                ->delete();
            
            // Insert aggregated data
            $affected = DB::insert("
                INSERT INTO item_details_daily_summary (
                    date, 
                    branch_name, 
                    store_name, 
                    category_code, 
                    product_code, 
                    quantity, 
                    net_sales
                )
                SELECT 
                    h.date,
                    id.branch_name,
                    id.store_name,
                    id.category_code,
                    id.product_code,
                    SUM(CAST(id.qty AS DECIMAL(10, 2))),
                    SUM(CAST(id.net_total AS DECIMAL(10, 2)))
                FROM 
                    item_details id
                JOIN header h ON id.si_number = h.si_number 
                              AND id.terminal_number = h.terminal_number 
                              AND id.branch_name = h.branch_name
                              AND id.store_name = h.store_name
                LEFT JOIN products p ON id.product_code = p.product_code
                                    AND p.branch_name = id.branch_name
                                    AND p.store_name = id.store_name
                WHERE h.date = ?
                GROUP BY 
                    h.date,
                    id.branch_name, 
                    id.store_name,
                    id.category_code,
                    id.product_code
            ", [$date]);
            
            // Commit the transaction
            DB::commit();
            
            $this->info("Summary table updated successfully for {$date}");
            // Post-insert diagnostic: count rows actually present for this date
            $inserted = DB::table('item_details_daily_summary')->where('date', $date)->count();
            $this->info("[Diag] Summary rows present for {$date}: {$inserted}");
            return 0;
        } catch (\Exception $e) {
            // Roll back the transaction if something goes wrong
            DB::rollBack();
            $this->error("Error updating summary table: " . $e->getMessage());
            $this->error("SQL: " . $e->getTraceAsString());
            return 1;
        }
    }
    
    /**
     * Update a date range in the summary table
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
        
        $this->info("Updating summary table for date range: {$startDate} to {$endDate}");
        
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
            DB::beginTransaction();
            
            try {
                // Pre-insert diagnostic: how many groups would be inserted for this date?
                $diag = DB::selectOne("
                    SELECT COUNT(*) AS cnt FROM (
                        SELECT 
                            h.date,
                            id.branch_name,
                            id.store_name,
                            id.category_code,
                            id.product_code
                        FROM 
                            item_details id
                        JOIN header h ON id.si_number = h.si_number 
                                      AND id.terminal_number = h.terminal_number 
                                      AND id.branch_name = h.branch_name
                                      AND id.store_name = h.store_name
                        LEFT JOIN products p ON id.product_code = p.product_code
                                            AND p.branch_name = id.branch_name
                                            AND p.store_name = id.store_name
                        WHERE h.date = ?
                        GROUP BY 
                            h.date,
                            id.branch_name, 
                            id.store_name,
                            id.category_code,
                            id.product_code
                    ) s
                ", [$date]);
                $this->info("[Diag] Groups to insert for {$date}: " . ((array)$diag)['cnt']);

                // Delete existing records for this date (to handle updates)
                DB::table('item_details_daily_summary')
                    ->where('date', $date)
                    ->delete();
                
                // Insert aggregated data
                DB::insert("
                    INSERT INTO item_details_daily_summary (
                        date, 
                        branch_name, 
                        store_name, 
                        category_code, 
                        product_code, 
                        quantity, 
                        net_sales
                    )
                    SELECT 
                        h.date,
                        id.branch_name,
                        id.store_name,
                        id.category_code,
                        id.product_code,
                        SUM(CAST(id.qty AS DECIMAL(10, 2))),
                        SUM(CAST(id.net_total AS DECIMAL(10, 2)))
                    FROM 
                        item_details id
                    JOIN header h ON id.si_number = h.si_number 
                                  AND id.terminal_number = h.terminal_number 
                                  AND id.branch_name = h.branch_name
                                  AND id.store_name = h.store_name
                    LEFT JOIN products p ON id.product_code = p.product_code
                                        AND p.branch_name = id.branch_name
                                        AND p.store_name = id.store_name
                    WHERE h.date = ?
                    GROUP BY 
                        h.date,
                        id.branch_name, 
                        id.store_name,
                        id.category_code,
                        id.product_code
                ", [$date]);
                
                DB::commit();
                $successCount++;
                
                // Check how many rows were inserted for this date
                $dateRowCount = DB::table('item_details_daily_summary')->where('date', $date)->count();
                $this->info("Inserted {$dateRowCount} rows for date {$date}");
            } catch (\Exception $e) {
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
     * Update all dates in the summary table
     */
    protected function updateAllDates()
    {
        $this->info('Starting to update summary table for all dates...');
        
        // Clear the summary table first
        if ($this->confirm('This will delete all existing data in the summary table. Continue?', true)) {
            DB::table('item_details_daily_summary')->truncate();
            $this->info('Summary table cleared.');
        } else {
            $this->info('Operation cancelled.');
            return 1;
        }
        
        try {
            $this->info('Processing all dates with a single query...');

            // Pre-insert diagnostic (all dates): how many groups would be inserted?
            $diagAll = DB::selectOne("
                SELECT COUNT(*) AS cnt FROM (
                    SELECT 
                        h.date,
                        id.branch_name,
                        id.store_name,
                        id.category_code,
                        id.product_code
                    FROM 
                        item_details id
                    JOIN header h ON id.si_number = h.si_number 
                                  AND id.terminal_number = h.terminal_number 
                                  AND id.branch_name = h.branch_name
                                  AND id.store_name = h.store_name
                    LEFT JOIN products p ON id.product_code = p.product_code
                                        AND p.branch_name = id.branch_name
                                        AND p.store_name = id.store_name
                    GROUP BY 
                        h.date,
                        id.branch_name, 
                        id.store_name,
                        id.category_code,
                        id.product_code
                ) s
            ");
            $this->info("[Diag] Groups to insert (all dates): " . ((array)$diagAll)['cnt']);

            // Insert aggregated data for all dates in a single query
            $affected = DB::insert("
                INSERT INTO item_details_daily_summary (
                    date, 
                    branch_name, 
                    store_name, 
                    category_code, 
                    product_code, 
                    quantity, 
                    net_sales
                )
                SELECT 
                    h.date,
                    id.branch_name,
                    id.store_name,
                    id.category_code,
                    id.product_code,
                    SUM(CAST(id.qty AS DECIMAL(10, 2))),
                    SUM(CAST(id.net_total AS DECIMAL(10, 2)))
                FROM 
                    item_details id
                JOIN header h ON id.si_number = h.si_number 
                              AND id.terminal_number = h.terminal_number 
                              AND id.branch_name = h.branch_name
                              AND id.store_name = h.store_name
                LEFT JOIN products p ON id.product_code = p.product_code
                                    AND p.branch_name = id.branch_name
                                    AND p.store_name = id.store_name
                GROUP BY 
                    h.date,
                    id.branch_name, 
                    id.store_name,
                    id.category_code,
                    id.product_code
            ");

            $this->info("Summary table update completed successfully. {$affected} summary rows were inserted.");
            
            // Check if any data was actually inserted
            $rowCount = DB::table('item_details_daily_summary')->count();
            $this->info("Total rows in summary table: {$rowCount}");
        } catch (\Exception $e) {
            $this->error("Error updating summary table for all dates: " . $e->getMessage());
            $this->error("SQL: " . $e->getTraceAsString());
            return 1;
        }
        
        return 0;
    }
}