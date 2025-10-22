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
        Schema::create('government_discount', function (Blueprint $table) {
            $table->id();
            $table->string('branch_name');
            $table->string('store_name');
            $table->date('date')->index();
            $table->integer('si_number')->index();
            $table->string('id_type')->nullable();
            $table->string('id_no')->nullable();
            $table->string('name')->nullable();
            $table->decimal('gross_amount', 10, 2);
            $table->decimal('discount_amount', 10, 2);
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
        Schema::dropIfExists('government_discount');
    }
};
