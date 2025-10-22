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
        Schema::create('header', function (Blueprint $table) {
            $table->id();
            $table->string('store_name');
            $table->string('branch_name')->index();
            $table->string('terminal_number')->index();
            $table->string('si_number')->index();
            $table->date('date')->index();
            $table->time('time')->index();
            $table->string('transaction_type')->nullable();
            $table->string('void_flag')->nullable();
            $table->string('guest_count')->nullable();
            $table->string('male_count')->nullable();
            $table->string('female_count')->nullable();
            $table->string('guest_count_senior')->nullable();
            $table->string('guest_count_pwd')->nullable();
            $table->decimal('gross_amount', 10, 2)->nullable();
            $table->decimal('net_amount', 10, 2)->nullable();
            $table->decimal('vatable_sales', 10, 2)->nullable();
            $table->decimal('vat_amount', 10, 2)->nullable();
            $table->decimal('service_charge', 10, 2)->nullable();
            $table->decimal('tip', 10, 2)->nullable();
            $table->decimal('total_discount', 10, 2)->nullable();
            $table->decimal('less_vat', 10, 2)->nullable();
            $table->decimal('vat_exempt_sales', 10, 2)->nullable();
            $table->decimal('zero_rated_sales', 10, 2)->nullable();
            $table->decimal('delivery_charge', 10, 2)->default(0.00)->nullable();
            $table->decimal('other_charges', 10, 2)->default(0.00)->nullable();
            $table->string('cashier_name')->index();
            $table->string('approved_by')->nullable();
            $table->string('void_reason', 250)->nullable();
            $table->timestamps();

            $table->foreign('store_name')->references('store_name')->on('stores')->onDelete('cascade');
            $table->foreign('branch_name')->references('branch_name')->on('branches')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('header');
    }
};
