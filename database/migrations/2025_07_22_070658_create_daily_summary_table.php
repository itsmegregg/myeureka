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
        Schema::create('daily_summary', function (Blueprint $table) {
            $table->id();
            $table->string('terminal_no')->index();
            $table->date('date')->index();
            $table->integer('si_from')->nullable();
            $table->integer('si_to')->nullable();
            $table->decimal('new_grand_total', 10, 2)->nullable();
            $table->decimal('old_grand_total', 10, 2)->nullable();
            $table->integer('z_read_counter')->nullable();
            $table->string('branch_name');
            $table->string('store_name');
            $table->timestamps();

            $table->foreign('branch_name')->references('branch_name')->on('branches')->onDelete('cascade');
            $table->foreign('store_name')->references('store_name')->on('stores')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_summary');
    }
};
