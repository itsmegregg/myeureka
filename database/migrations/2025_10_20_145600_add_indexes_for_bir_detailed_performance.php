<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE INDEX IF NOT EXISTS idx_header_date_branch_store_void
            ON header (date, branch_name, store_name, void_flag)
        SQL);

        DB::statement(<<<'SQL'
            CREATE INDEX IF NOT EXISTS idx_header_si_terminal_numeric
            ON header (
                (CAST(si_number AS NUMERIC)),
                (CAST(terminal_number AS NUMERIC)),
                branch_name,
                store_name
            )
        SQL);

        DB::statement(<<<'SQL'
            CREATE INDEX IF NOT EXISTS idx_header_branch_upper
            ON header ((TRIM(UPPER(branch_name))))
        SQL);

        DB::statement(<<<'SQL'
            CREATE INDEX IF NOT EXISTS idx_header_store_upper
            ON header ((TRIM(UPPER(store_name))))
        SQL);

        DB::statement(<<<'SQL'
            CREATE INDEX IF NOT EXISTS idx_item_details_join
            ON item_details (
                (CAST(si_number AS NUMERIC)),
                (CAST(terminal_number AS NUMERIC)),
                (TRIM(UPPER(branch_name))),
                (TRIM(UPPER(store_name)))
            )
            WHERE void_flag = '0'
        SQL);

        DB::statement(<<<'SQL'
            CREATE INDEX IF NOT EXISTS idx_payment_details_join
            ON payment_details (
                (CAST(si_number AS NUMERIC)),
                (CAST(terminal_number AS NUMERIC)),
                (TRIM(UPPER(branch_name))),
                (TRIM(UPPER(store_name)))
            )
        SQL);
    }

    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS idx_payment_details_join");
        DB::statement("DROP INDEX IF EXISTS idx_item_details_join");
        DB::statement("DROP INDEX IF EXISTS idx_header_store_upper");
        DB::statement("DROP INDEX IF EXISTS idx_header_branch_upper");
        DB::statement("DROP INDEX IF EXISTS idx_header_si_terminal_numeric");
        DB::statement("DROP INDEX IF EXISTS idx_header_date_branch_store_void");
    }
};
