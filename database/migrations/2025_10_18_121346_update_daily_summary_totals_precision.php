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
        Schema::table('daily_summary', function (Blueprint $table) {
    $table->decimal('new_grand_total', 14, 2)->nullable()->change();
    $table->decimal('old_grand_total', 14, 2)->nullable()->change();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('daily_summary', function (Blueprint $table) {
    $table->decimal('new_grand_total', 10, 2)->nullable()->change();
    $table->decimal('old_grand_total', 10, 2)->nullable()->change();
});
    }
};
