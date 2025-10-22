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
        Schema::create('item_details', function (Blueprint $table) {
            $table->id();
            $table->string('terminal_number')->index();
            $table->integer('si_number')->index();
            $table->string('product_code')->index();
            $table->string('description')->nullable();
            $table->string('category_code')->index()->nullable();
            $table->string('category_description')->nullable();
            $table->integer('qty')->nullable();
            $table->decimal('net_total', 10, 2)->nullable();
            $table->decimal('menu_price', 10, 2)->nullable();
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->string('discount_code')->nullable();
            $table->string('combo_header')->nullable();
            $table->string('void_flag')->default('0');
            $table->decimal('void_amount', 10, 2)->default(0.00);
            $table->string('branch_name');
            $table->string('store_name');
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
        Schema::dropIfExists('item_details');
    }
};
