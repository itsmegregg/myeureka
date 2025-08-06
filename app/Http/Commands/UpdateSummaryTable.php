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
                    p.category_code,
                    id.product_code,
                    SUM(id.qty),
                    SUM(id.net_total)
                FROM 
                    item_details id
                JOIN header h ON id.si_number = h.si_number 
                              AND id.terminal_number = h.terminal_number 
                              AND id.branch_name = h.branch_name
                JOIN product p ON id.product_code = p.product_code
                WHERE h.date = ?
                GROUP BY 
                    h.date,
                    id.branch_name, 
                    id.store_name,
                    p.category_code,
                    id.product_code
            ", [$date]);
            
            // Commit the transaction
            DB::commit();
            
            $this->info("Summary table updated successfully for {$date}");
            return 0;
        } catch (\Exception $e) {
            // Roll back the transaction if something goes wrong
            DB::rollBack();
            $this->error("Error updating summary table: " . $e->getMessage());
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
                        p.category_code,
                        id.product_code,
                        SUM(id.qty),
                        SUM(id.net_total)
                    FROM 
                        item_details id
                    JOIN header h ON id.si_number = h.si_number 
                                  AND id.terminal_number = h.terminal_number 
                                  AND id.branch_name = h.branch_name
                    JOIN product p ON id.product_code = p.product_code
                    WHERE h.date = ?
                    GROUP BY 
                        h.date,
                        id.branch_name, 
                        id.store_name,
                        p.category_code,
                        id.product_code
                ", [$date]);
                
                DB::commit();
                $successCount++;
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
        
        // Get all distinct dates from header
        $dates = DB::table('header')
            ->select('date')
            ->distinct()
            ->orderBy('date')
            ->pluck('date')
            ->toArray();
            
        $totalDates = count($dates);
        $this->info("Found {$totalDates} dates to process.");
        
        // Create progress bar
        $bar = $this->output->createProgressBar($totalDates);
        $bar->start();
        
        $successCount = 0;
        $errorCount = 0;
        
        // Process each date
        foreach ($dates as $date) {
            DB::beginTransaction();
            
            try {
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
                        p.category_code,
                        id.product_code,
                        SUM(id.qty),
                        SUM(id.net_total)
                    FROM 
                        item_details id
                    JOIN header h ON id.si_number = h.si_number 
                                  AND id.terminal_number = h.terminal_number 
                                  AND id.branch_name = h.branch_name
                    JOIN product p ON id.product_code = p.product_code
                    WHERE h.date = ?
                    GROUP BY 
                        h.date,
                        id.branch_name, 
                        id.store_name,
                        p.category_code,
                        id.product_code
                ", [$date]);
                
                DB::commit();
                $successCount++;
            } catch (\Exception $e) {
                DB::rollBack();
                $errorCount++;
                // Don't display error immediately to avoid cluttering the progress bar
            }
            
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine();
        
        $this->info("Summary table update completed.");
        $this->info("Successfully processed: {$successCount} dates");
        
        if ($errorCount > 0) {
            $this->warn("Failed to process: {$errorCount} dates");
        }
        
        return 0;
    }
}