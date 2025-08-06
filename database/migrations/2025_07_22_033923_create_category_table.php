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
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_code')->unique()->index();
            $table->string('category_name');
            $table->string('category_description')->nullable();
            $table->string('active')->default('yes')->nullable();
            $table->string('store_name');
            $table->foreign('store_name')->references('store_name')->on('stores')->onDelete('cascade');
        
            $table->timestamps();
            
            // Add a unique constraint to category_name within the store_name scope
            $table->unique(['category_name', 'store_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
