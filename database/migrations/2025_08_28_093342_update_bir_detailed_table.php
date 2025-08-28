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
        Schema::table('bir_detailed', function (Blueprint $table) {
            $table->decimal('service_charge')->nullable()->default(0);
            $table->decimal('takeout_charge')->nullable()->default(0);
            $table->decimal('delivery_charge')->nullable()->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bir_detailed', function (Blueprint $table) {
            $table->dropColumn('service_charge');
            $table->dropColumn('takeout_charge');
            $table->dropColumn('delivery_charge');
        });
    }
};
