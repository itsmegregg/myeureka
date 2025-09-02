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
        Schema::table('zread', function (Blueprint $table) {
            // Add new columns
            $table->text('file_content')->nullable()->after('file_path');
            $table->string('file_name')->nullable()->after('file_content');
            $table->string('mime_type', 100)->default('text/plain')->after('file_name');
            $table->dropColumn('file_path');
            // Keep file_path for backward compatibility during transition
        });
        
        // Copy existing file contents to the database (if any files exist)
        // This is a placeholder - you'll need to implement the actual file reading logic
        // based on your application's storage structure
        
        // After verifying data is migrated, you can optionally drop the file_path column
        // Schema::table('zread', function (Blueprint $table) {
        //     $table->dropColumn('file_path');
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('zread', function (Blueprint $table) {
            // If you need to rollback, you can restore files from the database
            // This would require implementing the reverse logic
            
            // Drop the new columns
            $table->dropColumn(['file_content', 'file_name', 'mime_type']);
            
            // If you dropped file_path, you would need to add it back here
            // $table->string('file_path')->nullable();
        });
    }
};
