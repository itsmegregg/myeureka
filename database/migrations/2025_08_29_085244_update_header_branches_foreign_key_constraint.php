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

        // Disable foreign key triggers (PostgreSQL specific)
        DB::statement('SET session_replication_role = replica;');

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
                    AND pg_get_constraintdef(oid) LIKE '%branch_name%';",
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

        // Re-enable foreign key triggers (PostgreSQL specific)
        DB::statement('SET session_replication_role = DEFAULT;');
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
