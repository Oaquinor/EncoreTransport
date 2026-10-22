<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_action_logs', function (Blueprint $table) {
            $table->id();
            $table->string('agent', 64);
            $table->string('channel', 32);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('role', 32)->nullable();
            $table->json('permissions')->nullable();
            $table->string('session_id', 128)->nullable()->index();
            $table->string('tool', 128);
            $table->json('arguments')->nullable();
            $table->json('result')->nullable();
            $table->boolean('confirmation_required')->default(false);
            $table->string('confirmation_result', 32)->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
            $table->index(['agent', 'channel', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_action_logs');
    }
};
