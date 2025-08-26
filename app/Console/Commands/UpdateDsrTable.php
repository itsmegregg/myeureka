<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class UpdateDsrTable extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'dsr:update {date? : Date to update (YYYY-MM-DD format, defaults to yesterday)}
                           {--all : Update all dates from the entire history}
                           {--previous : Update the previous day\'s data}
                           {--start= : Start date for range update (YYYY-MM-DD format)}
                           {--end= : End date for range update (YYYY-MM-DD format)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update the dsr table with aggregated daily sales data. Supports single date, date range, or all dates.';

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
        
        // Check if --previous flag is provided
        if ($this->option('previous')) {
            $date = Carbon::yesterday()->format('Y-m-d');
            return $this->updateSingleDate($date);
        }
        
        // Otherwise process single date provided or default to yesterday
        $date = $this->argument('date') ?? Carbon::yesterday()->format('Y-m-d');
        return $this->updateSingleDate($date);
    }
    
    /**
     * Update a single date in the dsr table
     */
    protected function updateSingleDate($date)
    {
        $this->info("Updating DSR table for date: {$date}");
        
        // Check if data exists for this date in daily_summary
        $hasData = DB::table('daily_summary')->where('date', $date)->exists();
        
        if (!$hasData) {
            $this->warn("No data found for {$date} in the daily_summary table. Skipping update.");
            return 0;
        }
        
        // Begin transaction
        DB::beginTransaction();
        
        try {
            // Delete existing records for this date (to handle updates)
            DB::table('dsr')
                ->where('date', $date)
                ->delete();
            
            // Insert aggregated data
            DB::insert("
                INSERT INTO dsr (
                    date, branch_name, store_name, terminal_no, si_from, si_to, old_grand_total, new_grand_total,
                    number_of_transactions, number_of_guests, total_service_charge, total_gross_sales, total_net_sales_after_void,
                    total_void_amount, \"PWD_Discount\", \"Senior_Discount\", \"National_Athletes_Discount\", \"Solo_Parent_Discount\",
                    \"Valor_Discount\", \"Other_Discounts\", z_read_counter
                )
                SELECT
                    h.date, h.branch_name, h.store_name, h.terminal_number, 
                    COALESCE(ds.si_from, '0'), 
                    COALESCE(ds.si_to, '0'), 
                    COALESCE(CAST(ds.old_grand_total AS NUMERIC(15,2)), 0), 
                    COALESCE(CAST(ds.new_grand_total AS NUMERIC(15,2)), 0),
                    (CAST(COALESCE(ds.si_to, '0') AS INTEGER) - CAST(COALESCE(ds.si_from, '0') AS INTEGER) + 1) AS number_of_transactions,
                    SUM(CAST(h.guest_count AS INTEGER)) AS number_of_guests,
                    SUM(CAST(h.service_charge AS NUMERIC(15,2))) AS total_service_charge,
                    SUM(CAST(h.gross_amount AS NUMERIC(15,2))) - COALESCE(SUM(tis.total_void_amount), 0) AS total_gross_sales,
                    (SUM(CAST(h.net_amount AS NUMERIC(15,2))) - COALESCE(SUM(tis.total_void_amount), 0)) AS total_net_sales_after_void,
                    COALESCE(SUM(tis.total_void_amount), 0) AS total_void_amount,
                    COALESCE(SUM(tis.PWD_Discount), 0) AS \"PWD_Discount\",
                    COALESCE(SUM(tis.Senior_Discount), 0) AS \"Senior_Discount\",
                    COALESCE(SUM(tis.National_Athletes_Discount), 0) AS \"National_Athletes_Discount\",
                    COALESCE(SUM(tis.Solo_Parent_Discount), 0) AS \"Solo_Parent_Discount\",
                    COALESCE(SUM(tis.Valor_Discount), 0) AS \"Valor_Discount\",
                    COALESCE(SUM(tis.Other_Discounts), 0) AS \"Other_Discounts\",
                    COALESCE(ds.z_read_counter, '0') AS z_read_counter
                FROM header h
                LEFT JOIN (
                    SELECT
                        id.branch_name, id.store_name, id.terminal_number, id.si_number,
                        SUM(CAST(id.void_amount AS NUMERIC(15, 2))) AS total_void_amount,
                        SUM(CASE WHEN id.discount_code = 'DISABILITY' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS PWD_Discount,
                        SUM(CASE WHEN id.discount_code = 'SENIOR' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Senior_Discount,
                        SUM(CASE WHEN UPPER(id.discount_code) IN ('NATIONAL ATHLETES', 'ATHLETES', 'COACH', 'ATHELETS/COACH') THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS National_Athletes_Discount,
                        SUM(CASE WHEN id.discount_code = 'SOLO PARENT' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Solo_Parent_Discount,
                        SUM(CASE WHEN id.discount_code = 'VALOR' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Valor_Discount,
                        SUM(CASE WHEN UPPER(id.discount_code) NOT IN ('DISABILITY', 'SENIOR', 'NATIONAL ATHLETES', 'ATHLETES', 'COACH', 'SOLO PARENT', 'VALOR', 'EMPLOYEE DISCOUNT') THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Other_Discounts
                    FROM item_details id
                    GROUP BY id.branch_name, id.store_name, id.terminal_number, id.si_number
                ) tis ON h.branch_name = tis.branch_name AND h.store_name = tis.store_name AND h.terminal_number = tis.terminal_number AND h.si_number = tis.si_number
                LEFT JOIN daily_summary ds ON h.date = ds.date AND h.branch_name = ds.branch_name AND h.store_name = ds.store_name
                WHERE h.date = ?
                GROUP BY h.date, h.branch_name, h.store_name, h.terminal_number, ds.si_from, ds.si_to, ds.old_grand_total, ds.new_grand_total, ds.z_read_counter
            
            ", [$date]);
            
            // Commit the transaction
            DB::commit();
            
            $this->info("DSR table updated successfully for {$date}");
            return 0;
        } catch (\Exception $e) {
            // Roll back the transaction if something goes wrong
            DB::rollBack();
            $this->error("Error updating DSR table for date {$date}: " . $e->getMessage());
            return 1;
        }
    }
    
    /**
     * Update a date range in the dsr table
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
        
        $this->info("Updating DSR table for date range: {$startDate} to {$endDate}");
        
        // Get all dates within the range that exist in the daily_summary table
        $dates = DB::table('daily_summary')
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
                DB::table('dsr')
                    ->where('date', $date)
                    ->delete();
                
                // Insert aggregated data
                DB::insert("
                INSERT INTO dsr (
                    date, branch_name, store_name, terminal_no, si_from, si_to, old_grand_total, new_grand_total,
                    number_of_transactions, number_of_guests, total_service_charge, total_gross_sales, total_net_sales_after_void,
                    total_void_amount, \"PWD_Discount\", \"Senior_Discount\", \"National_Athletes_Discount\", \"Solo_Parent_Discount\",
                    \"Valor_Discount\", \"Other_Discounts\", z_read_counter
                )
                SELECT
                    h.date, h.branch_name, h.store_name, h.terminal_number, 
                    COALESCE(ds.si_from, '0'), 
                    COALESCE(ds.si_to, '0'), 
                    COALESCE(CAST(ds.old_grand_total AS NUMERIC(15,2)), 0), 
                    COALESCE(CAST(ds.new_grand_total AS NUMERIC(15,2)), 0),
                    (CAST(COALESCE(ds.si_to, '0') AS INTEGER) - CAST(COALESCE(ds.si_from, '0') AS INTEGER) + 1) AS number_of_transactions,
                    SUM(CAST(h.guest_count AS INTEGER)) AS number_of_guests,
                    SUM(CAST(h.service_charge AS NUMERIC(15,2))) AS total_service_charge,
                    SUM(CAST(h.gross_amount AS NUMERIC(15,2))) - COALESCE(SUM(tis.total_void_amount), 0) AS total_gross_sales,
                    (SUM(CAST(h.net_amount AS NUMERIC(15,2))) - COALESCE(SUM(tis.total_void_amount), 0)) AS total_net_sales_after_void,
                    COALESCE(SUM(tis.total_void_amount), 0) AS total_void_amount,
                    COALESCE(SUM(tis.PWD_Discount), 0) AS \"PWD_Discount\",
                    COALESCE(SUM(tis.Senior_Discount), 0) AS \"Senior_Discount\",
                    COALESCE(SUM(tis.National_Athletes_Discount), 0) AS \"National_Athletes_Discount\",
                    COALESCE(SUM(tis.Solo_Parent_Discount), 0) AS \"Solo_Parent_Discount\",
                    COALESCE(SUM(tis.Valor_Discount), 0) AS \"Valor_Discount\",
                    COALESCE(SUM(tis.Other_Discounts), 0) AS \"Other_Discounts\",
                    COALESCE(ds.z_read_counter, '0') AS z_read_counter
                FROM header h
                LEFT JOIN (
                    SELECT
                        id.branch_name, id.store_name, id.terminal_number, id.si_number,
                        SUM(CAST(id.void_amount AS NUMERIC(15, 2))) AS total_void_amount,
                        SUM(CASE WHEN id.discount_code = 'DISABILITY' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS PWD_Discount,
                        SUM(CASE WHEN id.discount_code = 'SENIOR' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Senior_Discount,
                        SUM(CASE WHEN UPPER(id.discount_code) IN ('NATIONAL ATHLETES', 'ATHLETES', 'COACH') THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS National_Athletes_Discount,
                        SUM(CASE WHEN id.discount_code = 'SOLO PARENT' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Solo_Parent_Discount,
                        SUM(CASE WHEN id.discount_code = 'VALOR' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Valor_Discount,
                        SUM(CASE WHEN UPPER(id.discount_code) NOT IN ('DISABILITY', 'SENIOR', 'NATIONAL ATHLETES', 'ATHLETES', 'COACH', 'SOLO PARENT', 'VALOR', 'EMPLOYEE DISCOUNT') THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Other_Discounts
                    FROM item_details id
                    GROUP BY id.branch_name, id.store_name, id.terminal_number, id.si_number
                ) tis ON h.branch_name = tis.branch_name AND h.store_name = tis.store_name AND h.terminal_number = tis.terminal_number AND h.si_number = tis.si_number
                LEFT JOIN daily_summary ds ON h.date = ds.date AND h.branch_name = ds.branch_name AND h.store_name = ds.store_name
                WHERE h.date = ?
                GROUP BY h.date, h.branch_name, h.store_name, h.terminal_number, ds.si_from, ds.si_to, ds.old_grand_total, ds.new_grand_total, ds.z_read_counter
            
            ON CONFLICT (date, branch_name, store_name, terminal_no) 
            DO UPDATE SET
                si_from = EXCLUDED.si_from,
                si_to = EXCLUDED.si_to,
                old_grand_total = EXCLUDED.old_grand_total,
                new_grand_total = EXCLUDED.new_grand_total,
                number_of_transactions = EXCLUDED.number_of_transactions,
                number_of_guests = EXCLUDED.number_of_guests,
                total_service_charge = EXCLUDED.total_service_charge,
                total_gross_sales = EXCLUDED.total_gross_sales,
                total_net_sales_after_void = EXCLUDED.total_net_sales_after_void,
                total_void_amount = EXCLUDED.total_void_amount,
                PWD_Discount = EXCLUDED.PWD_Discount,
                Senior_Discount = EXCLUDED.Senior_Discount,
                National_Athletes_Discount = EXCLUDED.National_Athletes_Discount,
                Solo_Parent_Discount = EXCLUDED.Solo_Parent_Discount,
                Valor_Discount = EXCLUDED.Valor_Discount,
                Other_Discounts = EXCLUDED.Other_Discounts,
                z_read_counter = EXCLUDED.z_read_counter", [$date]);
                
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
     * Update all dates in the dsr table
     */
    protected function updateAllDates()
    {
        $this->info('Starting to update DSR table for all dates...');
        
        // Clear the summary table first
        if ($this->confirm('This will delete all existing data in the DSR table. Continue?', true)) {
            DB::table('dsr')->truncate();
            $this->info('DSR table cleared.');
        } else {
            $this->info('Operation cancelled.');
            return 1;
        }
        
        // Get all distinct dates from daily_summary
        $dates = DB::table('daily_summary')
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
                INSERT INTO dsr (
                    date, branch_name, store_name, terminal_no, si_from, si_to, old_grand_total, new_grand_total,
                    number_of_transactions, number_of_guests, total_service_charge, total_gross_sales, total_net_sales_after_void,
                    total_void_amount, \"PWD_Discount\", \"Senior_Discount\", \"National_Athletes_Discount\", \"Solo_Parent_Discount\",
                    \"Valor_Discount\", \"Other_Discounts\", z_read_counter
                )
                SELECT
                    h.date, h.branch_name, h.store_name, h.terminal_number, 
                    COALESCE(ds.si_from, '0'), 
                    COALESCE(ds.si_to, '0'), 
                    COALESCE(CAST(ds.old_grand_total AS NUMERIC(15,2)), 0), 
                    COALESCE(CAST(ds.new_grand_total AS NUMERIC(15,2)), 0),
                    (CAST(COALESCE(ds.si_to, '0') AS INTEGER) - CAST(COALESCE(ds.si_from, '0') AS INTEGER) + 1) AS number_of_transactions,
                    SUM(CAST(h.guest_count AS INTEGER)) AS number_of_guests,
                    SUM(CAST(h.service_charge AS NUMERIC(15,2))) AS total_service_charge,
                    SUM(CAST(h.gross_amount AS NUMERIC(15,2))) - COALESCE(SUM(tis.total_void_amount), 0) AS total_gross_sales,
                    (SUM(CAST(h.net_amount AS NUMERIC(15,2))) - COALESCE(SUM(tis.total_void_amount), 0)) AS total_net_sales_after_void,
                    COALESCE(SUM(tis.total_void_amount), 0) AS total_void_amount,
                    COALESCE(SUM(tis.PWD_Discount), 0) AS \"PWD_Discount\",
                    COALESCE(SUM(tis.Senior_Discount), 0) AS \"Senior_Discount\",
                    COALESCE(SUM(tis.National_Athletes_Discount), 0) AS \"National_Athletes_Discount\",
                    COALESCE(SUM(tis.Solo_Parent_Discount), 0) AS \"Solo_Parent_Discount\",
                    COALESCE(SUM(tis.Valor_Discount), 0) AS \"Valor_Discount\",
                    COALESCE(SUM(tis.Other_Discounts), 0) AS \"Other_Discounts\",
                    COALESCE(ds.z_read_counter, '0') AS z_read_counter
                FROM header h
                LEFT JOIN (
                    SELECT
                        id.branch_name, id.store_name, id.terminal_number, id.si_number,
                        SUM(CAST(id.void_amount AS NUMERIC(15, 2))) AS total_void_amount,
                        SUM(CASE WHEN id.discount_code = 'DISABILITY' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS PWD_Discount,
                        SUM(CASE WHEN id.discount_code = 'SENIOR' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Senior_Discount,
                        SUM(CASE WHEN UPPER(id.discount_code) IN ('NATIONAL ATHLETES', 'ATHLETES', 'COACH') THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS National_Athletes_Discount,
                        SUM(CASE WHEN id.discount_code = 'SOLO PARENT' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Solo_Parent_Discount,
                        SUM(CASE WHEN id.discount_code = 'VALOR' THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Valor_Discount,
                        SUM(CASE WHEN UPPER(id.discount_code) NOT IN ('DISABILITY', 'SENIOR', 'NATIONAL ATHLETES', 'ATHLETES', 'COACH', 'SOLO PARENT', 'VALOR', 'EMPLOYEE DISCOUNT') THEN CAST(id.discount_amount AS NUMERIC(15, 2)) ELSE 0 END) AS Other_Discounts
                    FROM item_details id
                    GROUP BY id.branch_name, id.store_name, id.terminal_number, id.si_number
                ) tis ON h.branch_name = tis.branch_name AND h.store_name = tis.store_name AND h.terminal_number = tis.terminal_number AND h.si_number = tis.si_number
                LEFT JOIN daily_summary ds ON h.date = ds.date AND h.branch_name = ds.branch_name AND h.store_name = ds.store_name
                WHERE h.date = ?
                GROUP BY h.date, h.branch_name, h.store_name, h.terminal_number, ds.si_from, ds.si_to, ds.old_grand_total, ds.new_grand_total, ds.z_read_counter
                ", [$date]);
                
                DB::commit();
                $successCount++;
            } catch (\Exception $e) {
                DB::rollBack();
                $errorCount++;
                $this->error("Error processing date {$date}: " . $e->getMessage());
            }
            
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine();
        
        $this->info("DSR table update completed.");
        $this->info("Successfully processed: {$successCount} dates");
        
        if ($errorCount > 0) {
            $this->warn("Failed to process: {$errorCount} dates");
        }
        
        return 0;
    }
}
