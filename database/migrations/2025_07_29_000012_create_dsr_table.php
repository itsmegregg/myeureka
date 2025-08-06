<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dsr', function (Blueprint $table) {
            $table->date('date');
            $table->string('branch_name', 100);
            $table->string('store_name', 100);
            $table->string('terminal_no', 20);
            $table->string('si_from', 50);
            $table->string('si_to', 50);
            $table->decimal('old_grand_total', 20, 2);
            $table->decimal('new_grand_total', 20, 2);
            $table->integer('number_of_transactions');
            $table->integer('number_of_guests');
            $table->decimal('total_service_charge', 20, 2)->default(0.00);
            $table->decimal('total_gross_sales', 20, 2)->default(0.00);
            $table->decimal('total_net_sales_after_void', 20, 2)->default(0.00);
            $table->decimal('total_void_amount', 20, 2)->default(0.00);
            $table->decimal('PWD_Discount', 20, 2)->default(0.00);
            $table->decimal('Senior_Discount', 20, 2)->default(0.00);
            $table->decimal('National_Athletes_Discount', 20, 2)->default(0.00);
            $table->decimal('Solo_Parent_Discount', 20, 2)->default(0.00);
            $table->decimal('Valor_Discount', 20, 2)->default(0.00);
            $table->decimal('Other_Discounts', 20, 2)->default(0.00);
            $table->string('z_read_counter', 50);

            $table->primary(['date', 'branch_name', 'store_name', 'terminal_no']);
            $table->index('date', 'idx_dsr_date');
            $table->index('branch_name', 'idx_dsr_branch');
            $table->index('store_name', 'idx_dsr_store');
            $table->index('terminal_no', 'idx_dsr_terminal');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dsr');
    }
};
