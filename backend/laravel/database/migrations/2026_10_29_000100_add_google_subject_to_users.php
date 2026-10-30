<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'google_subject')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('google_subject')->nullable()->unique()->after('email');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'google_subject')) {
            Schema::table('users', fn (Blueprint $table) => $table->dropColumn('google_subject'));
        }
    }
};
