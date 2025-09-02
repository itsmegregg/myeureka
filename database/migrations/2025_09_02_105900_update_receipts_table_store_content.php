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
        Schema::table('receipts', function (Blueprint $table) {
            // Add new columns
            $table->text('file_content')->nullable()->after('file_path');
            $table->string('file_name')->nullable()->after('file_content');
            $table->string('mime_type', 100)->default('text/plain')->after('file_name');
            $table->dropColumn('file_path');
        });

        // After verifying data is migrated, you can drop the file_path column
        // Schema::table('receipts', function (Blueprint $table) {
        //     $table->dropColumn('file_path');
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            // If rolling back, add file_path back
           
            
            // Drop the new columns
            $table->dropColumn(['file_content', 'file_name', 'mime_type']);
        });
    }
};
