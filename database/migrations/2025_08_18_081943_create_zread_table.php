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
        Schema::create('zread', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->string('branch_name')->index();
            $table->string('file_path');
            $table->timestamps();

            
            $table->foreign('branch_name')->references('branch_name')->on('branches')->onDelete('cascade');
     
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('zread');
    }
};
