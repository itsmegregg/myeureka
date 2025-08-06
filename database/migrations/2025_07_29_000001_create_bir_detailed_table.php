<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bir_detailed', function (Blueprint $table) {
            $table->date('date');
            $table->string('branch_name', 100);
            $table->string('store_name', 100);
            $table->string('terminal_number', 20);
            $table->string('si_number', 50);
            $table->decimal('vat_exempt_sales', 20, 5)->default(0.00000);
            $table->decimal('zero_rated_sales', 20, 5)->default(0.00000);
            $table->decimal('vat_amount', 20, 5)->default(0.00000);
            $table->decimal('less_vat', 20, 5)->default(0.00000);
            $table->decimal('gross_amount', 20, 2)->default(0.00);
            $table->string('discount_code', 255)->nullable();
            $table->decimal('discount_amount', 20, 5)->default(0.00000);
            $table->decimal('net_total', 20, 5)->default(0.00000);
            $table->string('payment_type', 255)->nullable();
            $table->decimal('amount', 20, 2)->default(0.00);

            $table->primary(['date', 'branch_name', 'store_name', 'terminal_number', 'si_number']);
            $table->index('date', 'idx_bir_detailed_date');
            $table->index('branch_name', 'idx_bir_detailed_branch');
            $table->index('store_name', 'idx_bir_detailed_store');
            $table->index('terminal_number', 'idx_bir_detailed_terminal');
            $table->index('payment_type', 'idx_bir_detailed_payment_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bir_detailed');
    }
};
