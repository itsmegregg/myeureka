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
        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->string('si_number');
            $table->date('date');
            $table->string('branch_name');
            $table->string('type')->nullable();
            $table->text('file_content')->nullable();
            $table->string('file_name')->nullable();
            $table->string('mime_type', 100)->default('text/plain');
            $table->timestamps();

            $table->foreign('branch_name')->references('branch_name')->on('branches')->onDelete('cascade');

            $table->index('date');
            $table->index('branch_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};
