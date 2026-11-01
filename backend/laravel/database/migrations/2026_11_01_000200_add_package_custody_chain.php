<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('packages') && !Schema::hasColumn('packages', 'qr_token_hash')) {
            Schema::table('packages', function (Blueprint $table) {
                $table->char('qr_token_hash', 64)->nullable()->unique()->after('tracking_token_hash');
                $table->text('qr_payload')->nullable()->after('qr_token_hash');
            });
        }

        if (!Schema::hasTable('package_transfers')) {
            Schema::create('package_transfers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('package_id')->constrained('packages')->cascadeOnDelete();
                $table->foreignId('from_driver_id')->nullable()->constrained('drivers')->nullOnDelete();
                $table->foreignId('to_driver_id')->nullable()->constrained('drivers')->nullOnDelete();
                $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('status', 24)->default('pending');
                $table->text('notes')->nullable();
                $table->timestamp('requested_at');
                $table->timestamp('accepted_at')->nullable();
                $table->timestamps();
                $table->index(['package_id', 'status']);
            });
        }

        if (!Schema::hasTable('package_manifests')) {
            Schema::create('package_manifests', function (Blueprint $table) {
                $table->id();
                $table->uuid('public_id')->unique();
                $table->foreignId('trip_id')->nullable()->constrained('trips')->nullOnDelete();
                $table->foreignId('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('reference', 40)->unique();
                $table->string('status', 24)->default('draft');
                $table->unsignedInteger('expected_count')->default(0);
                $table->unsignedInteger('scanned_count')->default(0);
                $table->timestamp('reconciled_at')->nullable();
                $table->timestamps();
                $table->index(['trip_id', 'status']);
            });
        }

        if (!Schema::hasTable('package_manifest_items')) {
            Schema::create('package_manifest_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('manifest_id')->constrained('package_manifests')->cascadeOnDelete();
                $table->foreignId('package_id')->constrained('packages')->cascadeOnDelete();
                $table->foreignId('scanned_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('status', 24)->default('expected');
                $table->timestamp('scanned_at')->nullable();
                $table->timestamps();
                $table->unique(['manifest_id', 'package_id']);
                $table->index(['manifest_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('package_manifest_items');
        Schema::dropIfExists('package_manifests');
        Schema::dropIfExists('package_transfers');

        if (Schema::hasTable('packages')) {
            Schema::table('packages', function (Blueprint $table) {
                if (Schema::hasColumn('packages', 'qr_payload')) {
                    $table->dropColumn('qr_payload');
                }
                if (Schema::hasColumn('packages', 'qr_token_hash')) {
                    $table->dropUnique(['qr_token_hash']);
                    $table->dropColumn('qr_token_hash');
                }
            });
        }
    }
};
