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
        Schema::create('payment_details', function (Blueprint $table) {
            $table->id();
            $table->string('terminal_number')->index();
            $table->string('si_number')->index();
            $table->string('payment_type')->index();
            $table->string('amount');
            $table->string('branch_name');
            $table->string('store_name');
            $table->timestamps();
            
            $table->foreign('branch_name')->references('branch_name')->on('branches')->onDelete('cascade');
            $table->foreign('store_name')->references('store_name')->on('stores')->onDelete('cascade');
            
            // Add unique constraint for terminal_number, si_number, payment_type, and store_name
            // This prevents duplicate entries for the same payment
            $table->unique(['terminal_number', 'si_number', 'payment_type', 'store_name'], 'payment_details_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_details');
    }
};
