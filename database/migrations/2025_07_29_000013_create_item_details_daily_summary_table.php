<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_details_daily_summary', function (Blueprint $table) {
            $table->date('date');
            $table->string('branch_name', 100);
            $table->string('store_name', 100);
            $table->string('category_code', 100);
            $table->string('product_code', 100);
            $table->decimal('quantity', 10, 2)->default(0.00);
            $table->decimal('net_sales', 10, 2)->default(0.00);

            $table->primary(['date', 'branch_name', 'store_name', 'category_code', 'product_code']);
            $table->index('date', 'item_details_daily_summary_date_index');
            $table->index('branch_name', 'item_details_daily_summary_branch_name_index');
            $table->index('store_name', 'item_details_daily_summary_store_name_index');
            $table->index('category_code', 'item_details_daily_summary_category_code_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_details_daily_summary');
    }
};
