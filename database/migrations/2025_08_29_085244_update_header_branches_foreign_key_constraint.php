<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // List of tables with branch_name foreign key
        $tables = [
            'header',
            'products',
            'daily_summary',
            'item_details',
            'payment_details',
            'government_discount',
            'receipts',
            'zread',
            'item_details_daily_summary',
            'dsr',
            'bir_detailed'
        ];

        // Collect all distinct branch_names from all tables
        $all_branch_names = [];
        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'branch_name')) {
                $branch_names_in_table = DB::table($table)->whereNotNull('branch_name')->distinct()->pluck('branch_name');
                foreach ($branch_names_in_table as $branch_name) {
                    $all_branch_names[$branch_name] = true;
                }
            }
        }
        $all_branch_names = array_keys($all_branch_names);

        // Find which branch_names are not in the branches table
        $existing_branches = DB::table('branches')->pluck('branch_name')->all();
        $missing_branches = array_diff($all_branch_names, $existing_branches);

        // Insert missing branches
        if (!empty($missing_branches)) {
            $branches_to_insert = [];
            foreach ($missing_branches as $branch_name) {
                // Ensure we don't insert null or empty strings
                if (!empty($branch_name)) {
                    $branches_to_insert[] = ['branch_name' => $branch_name];
                }
            }
            if (!empty($branches_to_insert)) {
                DB::table('branches')->insert($branches_to_insert);
            }
        }

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'branch_name')) {
                // Get the current foreign key constraints
                $constraints = DB::select(
                    "SELECT conname 
                    FROM pg_constraint 
                    JOIN pg_namespace ON pg_namespace.oid = connamespace 
                    JOIN pg_class ON pg_class.oid = conrelid 
                    WHERE contype = 'f' 
                    AND pg_class.relname = ? 
                    AND pg_get_constraintdef(pg_constraint.oid) LIKE '%branch_name%';",
                    [$table]
                );

                // Drop existing foreign key constraints
                foreach ($constraints as $constraint) {
                    DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$constraint->conname} CASCADE;");
                }

                // Re-add the foreign key with ON UPDATE CASCADE and ON DELETE CASCADE
                DB::statement("
                    ALTER TABLE {$table} 
                    ADD CONSTRAINT {$table}_branch_name_foreign 
                    FOREIGN KEY (branch_name) 
                    REFERENCES branches (branch_name) 
                    ON UPDATE CASCADE 
                    ON DELETE CASCADE;
                ");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This is a one-way migration as it's fixing data consistency
        // Rolling back could break referential integrity
    }
};
