<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE INDEX IF NOT EXISTS daily_summary_date_index ON daily_summary (date)');
        DB::statement('CREATE INDEX IF NOT EXISTS daily_summary_branch_store_date_idx ON daily_summary (UPPER(branch_name), UPPER(store_name), date)');

        DB::statement("CREATE INDEX IF NOT EXISTS header_date_branch_store_idx ON header (date, UPPER(branch_name), UPPER(store_name))");
        DB::statement("CREATE INDEX IF NOT EXISTS header_active_date_branch_store_idx ON header (date, UPPER(branch_name), UPPER(store_name)) WHERE COALESCE(TRIM(void_flag), '0') = '0'");
        DB::statement('CREATE INDEX IF NOT EXISTS header_si_number_numeric_idx ON header ((CAST(si_number AS NUMERIC)))');

        DB::statement('CREATE INDEX IF NOT EXISTS item_details_branch_store_terminal_si_idx ON item_details (UPPER(branch_name), UPPER(store_name), CAST(terminal_number AS NUMERIC), CAST(si_number AS NUMERIC))');
        DB::statement("CREATE INDEX IF NOT EXISTS item_details_discount_code_idx ON item_details (UPPER(discount_code)) WHERE COALESCE(TRIM(void_flag), '0') = '0'");

        DB::statement('CREATE INDEX IF NOT EXISTS payment_details_branch_store_terminal_si_idx ON payment_details (UPPER(branch_name), UPPER(store_name), CAST(terminal_number AS NUMERIC), CAST(si_number AS NUMERIC))');
        DB::statement('CREATE INDEX IF NOT EXISTS payment_details_payment_type_idx ON payment_details (payment_type)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS payment_details_payment_type_idx');
        DB::statement('DROP INDEX IF EXISTS payment_details_branch_store_terminal_si_idx');
        DB::statement('DROP INDEX IF EXISTS item_details_discount_code_idx');
        DB::statement('DROP INDEX IF EXISTS item_details_branch_store_terminal_si_idx');
        DB::statement('DROP INDEX IF EXISTS header_si_number_numeric_idx');
        DB::statement('DROP INDEX IF EXISTS header_active_date_branch_store_idx');
        DB::statement('DROP INDEX IF EXISTS header_date_branch_store_idx');
        DB::statement('DROP INDEX IF EXISTS daily_summary_branch_store_date_idx');
        DB::statement('DROP INDEX IF EXISTS daily_summary_date_index');
    }
};
