<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bir_daily_metrics', function (Blueprint $table) {
            $table->id();
            $table->date('business_date')->index();
            $table->string('branch_name');
            $table->string('store_name');
            $table->string('terminal_no')->nullable();
            $table->string('z_read_counter')->nullable();
            $table->decimal('si_from', 20, 4)->nullable();
            $table->decimal('si_to', 20, 4)->nullable();

            $table->decimal('beginning', 15, 2)->default(0);
            $table->decimal('ending', 15, 2)->default(0);
            $table->decimal('net_amount', 15, 2)->default(0);
            $table->decimal('service_charge', 15, 2)->default(0);
            $table->decimal('delivery_charge', 15, 2)->default(0);
            $table->decimal('void_amount', 15, 2)->default(0);
            $table->integer('total_guests')->default(0);
            $table->decimal('gross_amount', 15, 2)->default(0);
            $table->decimal('vatable', 15, 2)->default(0);
            $table->decimal('vat_amount', 15, 2)->default(0);
            $table->decimal('vat_exempt', 15, 2)->default(0);
            $table->decimal('zero_rated', 15, 2)->default(0);
            $table->decimal('less_vat', 15, 2)->default(0);

            $table->jsonb('discount_breakdown')->nullable();
            $table->jsonb('payment_breakdown')->nullable();
            $table->jsonb('meta')->nullable();

            $table->timestamp('generated_at')->nullable();
            $table->date('source_start_date')->nullable();
            $table->date('source_end_date')->nullable();

            $table->timestamps();

            $table->unique(['business_date', 'branch_name', 'store_name', 'terminal_no'], 'bir_daily_metrics_unique_idx');
            $table->index(['branch_name', 'store_name', 'business_date'], 'bir_daily_metrics_branch_store_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bir_daily_metrics');
    }
};
