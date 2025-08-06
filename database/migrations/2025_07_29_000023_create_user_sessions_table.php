<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_sessions', function (Blueprint $table) {
            $table->bigInteger('id')->unsigned()->primary()->autoIncrement();
            $table->bigInteger('user_id')->unsigned();
            $table->string('session_id', 255);
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('last_activity')->useCurrent()->onUpdate();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id', 'user_sessions_user_id_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_sessions');
    }
};
