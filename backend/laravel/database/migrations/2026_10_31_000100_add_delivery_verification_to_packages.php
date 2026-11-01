<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('packages', function (Blueprint $table): void {
            if (!Schema::hasColumn('packages', 'recipient_verified_at')) {
                $table->timestamp('recipient_verified_at')->nullable()->after('delivered_at');
            }
            if (!Schema::hasColumn('packages', 'delivery_photo_path')) {
                $table->string('delivery_photo_path')->nullable()->after('recipient_verified_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('packages', function (Blueprint $table): void {
            if (Schema::hasColumn('packages', 'delivery_photo_path')) {
                $table->dropColumn('delivery_photo_path');
            }
            if (Schema::hasColumn('packages', 'recipient_verified_at')) {
                $table->dropColumn('recipient_verified_at');
            }
        });
    }
};
