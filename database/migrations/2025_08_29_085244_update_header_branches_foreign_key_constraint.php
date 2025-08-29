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
        // Disable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

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

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'branch_name')) {
                // Drop existing foreign key constraint if it exists
                Schema::table($table, function (Blueprint $blueprint) use ($table) {
                    $foreignKeys = DB::select(
                        "SELECT CONSTRAINT_NAME 
                        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                        WHERE TABLE_NAME = ? 
                        AND COLUMN_NAME = 'branch_name' 
                        AND REFERENCED_TABLE_NAME IS NOT NULL", 
                        [$table]
                    );

                    foreach ($foreignKeys as $foreignKey) {
                        $blueprint->dropForeign([$foreignKey->CONSTRAINT_NAME]);
                    }
                });

                // Re-add the foreign key with ON UPDATE CASCADE and ON DELETE CASCADE
                Schema::table($table, function (Blueprint $blueprint) use ($table) {
                    $blueprint->foreign('branch_name')
                             ->references('branch_name')
                             ->on('branches')
                             ->onUpdate('cascade')
                             ->onDelete('cascade');
                });
            }
        }

        // Re-enable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
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
