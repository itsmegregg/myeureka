<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, add a new temporary column
        Schema::table('receipts', function (Blueprint $table) {
            $table->date('new_date')->nullable()->after('date');
        });

        // Convert existing data
        \DB::statement("UPDATE receipts SET new_date = to_timestamp(date::bigint)::date");

        // Remove old column and rename new one
        Schema::table('receipts', function (Blueprint $table) {
            $table->dropColumn('date');
            $table->renameColumn('new_date', 'date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add back the old column
        Schema::table('receipts', function (Blueprint $table) {
            $table->string('old_date')->nullable()->after('date');
        });

        // Convert data back to timestamp string
        \DB::statement("UPDATE receipts SET old_date = extract(epoch from date)::text");

        // Drop and rename columns
        Schema::table('receipts', function (Blueprint $table) {
            $table->dropColumn('date');
            $table->renameColumn('old_date', 'date');
        });
    }
};
