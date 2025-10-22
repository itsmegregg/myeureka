<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Disable transaction wrapping so we can create/drop indexes concurrently.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        DB::statement(<<<SQL
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_header_norm_keys
            ON header (
                UPPER(TRIM(branch_name)),
                UPPER(TRIM(store_name)),
                date,
                CAST(si_number AS NUMERIC),
                CAST(terminal_number AS NUMERIC)
            )
            WHERE COALESCE(TRIM(void_flag), '0') = '0'
        SQL);

        DB::statement(<<<SQL
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_summary_norm_keys
            ON daily_summary (
                UPPER(TRIM(branch_name)),
                UPPER(TRIM(store_name)),
                date,
                CAST(si_from AS NUMERIC),
                CAST(si_to AS NUMERIC)
            )
        SQL);

        DB::statement(<<<SQL
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_item_details_norm_keys
            ON item_details (
                UPPER(TRIM(branch_name)),
                UPPER(TRIM(store_name)),
                CAST(terminal_number AS NUMERIC),
                CAST(si_number AS NUMERIC)
            )
            WHERE COALESCE(TRIM(void_flag), '0') = '0'
        SQL);

        DB::statement(<<<SQL
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_details_norm_keys
            ON payment_details (
                UPPER(TRIM(branch_name)),
                UPPER(TRIM(store_name)),
                CAST(si_number AS NUMERIC)
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_payment_details_norm_keys');
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_item_details_norm_keys');
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_daily_summary_norm_keys');
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS idx_header_norm_keys');
    }
};
