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
            $table->string('gross_amount')->nullable();
            $table->string('net_amount')->nullable();
            $table->string('vatable_sales')->nullable();
            $table->string('vat_amount')->nullable();
            $table->string('service_charge')->nullable();
            $table->string('tip')->nullable();
            $table->string('total_discount')->nullable();
            $table->string('less_vat')->nullable();
            $table->string('vat_exempt_sales')->nullable();
            $table->string('zero_rated_sales')->nullable();
            $table->string('delivery_charge')->default('0')->nullable();
            $table->string('other_charges')->default('0')->nullable();
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
