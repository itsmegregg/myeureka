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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('product_name')->index();
            $table->string('product_code')->index();
            $table->string('product_description')->nullable();
            $table->string('active')->default('yes');
            $table->string('store_name');
            $table->foreign('store_name')->references('store_name')->on('stores')->onDelete('cascade');
            $table->string('category_code');
            $table->foreign('category_code')->references('category_code')->on('categories')->onDelete('cascade');
            $table->string('branch_name');   
            $table->timestamps();
            
            // Add a unique constraint for product identification
            // Products are unique based on combination of product_code, branch_name, and tenant_name
            $table->unique(['product_code', 'branch_name', 'store_name'], 'products_code_branch_tenant_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
