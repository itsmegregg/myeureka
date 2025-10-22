<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        DB::statement(<<<SQL
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_summary_sales_keys
            ON daily_summary (
                date,
                UPPER(TRIM(branch_name)),
                UPPER(TRIM(store_name)),
                CAST(terminal_no AS NUMERIC)
            )
        SQL);

        DB::statement(<<<SQL
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_summary_si_range
            ON daily_summary (
                CAST(si_from AS NUMERIC),
                CAST(si_to AS NUMERIC)
            )
        SQL);

        DB::statement(<<<SQL
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_header_sales_keys
            ON header (
                date,
                UPPER(TRIM(branch_name)),
                UPPER(TRIM(store_name)),
                CAST(terminal_number AS NUMERIC)
            )
            WHERE COALESCE(TRIM(void_flag), '0') = '0'
        SQL);

        DB::statement(<<<SQL
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_item_details_sales_keys
            ON item_details (
                UPPER(TRIM(branch_name)),
                UPPER(TRIM(store_name)),
                CAST(terminal_number AS NUMERIC),
                CAST(si_number AS NUMERIC)
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_item_details_sales_keys');
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_header_sales_keys');
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_daily_summary_si_range');
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_daily_summary_sales_keys');
    }
};
