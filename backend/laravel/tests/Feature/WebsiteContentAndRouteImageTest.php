<?php

namespace Tests\Feature;

use App\Models\ApiToken;
use App\Models\TransportRoute;
use App\Models\User;
use Database\Seeders\Demo\EncoreTransportDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class WebsiteContentAndRouteImageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->seed(EncoreTransportDemoSeeder::class);
    }

    public function test_website_draft_is_private_until_published_and_passenger_is_read_only(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $draft = ['sections' => ['hero' => ['title' => 'Travel with confidence', 'enabled' => true, 'order' => 0]], 'faqs' => []];

        $this->withToken($this->tokenFor($admin))->putJson('/api/v1/admin/website-content/draft', $draft)
            ->assertOk()->assertJsonPath('data.sections.hero.title', 'Travel with confidence');
        $this->getJson('/api/v1/website-content')->assertOk()->assertJsonPath('data', []);
        $this->withToken($this->tokenFor($passenger))->putJson('/api/v1/admin/website-content/publish', $draft)->assertForbidden();
        $this->withToken($this->tokenFor($admin))->putJson('/api/v1/admin/website-content/publish', $draft)
            ->assertOk()->assertJsonPath('data.sections.hero.title', 'Travel with confidence');
        $this->getJson('/api/v1/website-content')->assertOk()->assertJsonPath('data.sections.hero.title', 'Travel with confidence');
    }

    public function test_only_allowlisted_website_sections_and_safe_button_urls_can_be_published(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $this->withToken($this->tokenFor($admin))->putJson('/api/v1/admin/website-content/publish', [
            'sections' => ['unknown' => ['title' => 'Unexpected']], 'faqs' => [],
        ])->assertUnprocessable();
        $this->withToken($this->tokenFor($admin))->putJson('/api/v1/admin/website-content/publish', [
            'sections' => ['hero' => ['button_url' => 'javascript:alert(1)']], 'faqs' => [],
        ])->assertUnprocessable();
        $this->withToken($this->tokenFor($admin))->putJson('/api/v1/admin/website-content/publish', [
            'sections' => ['hero' => ['button_url' => '//example.org/path']], 'faqs' => [],
        ])->assertUnprocessable();
    }

    public function test_route_image_upload_is_persisted_and_visible_in_public_resource(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $token = $this->tokenFor($admin);
        $route = TransportRoute::query()->firstOrFail();

        $response = $this->withToken($token)->post('/api/v1/admin/routes/'.$route->id.'/image', [
            'image' => UploadedFile::fake()->image('route.png', 640, 360),
        ], ['Accept' => 'application/json'])->assertOk();
        $path = $route->fresh()->image_path;
        $this->assertNotEmpty($path);
        Storage::disk('public')->assertExists($path);
        $response->assertJsonPath('data.image_url', Storage::disk('public')->url($path));
        $this->getJson('/api/v1/routes')->assertOk()->assertJsonFragment(['image_url' => Storage::disk('public')->url($path)]);

        $this->withToken($token)->deleteJson('/api/v1/admin/routes/'.$route->id.'/image')->assertOk();
        Storage::disk('public')->assertMissing($path);
        $this->assertNull($route->fresh()->image_path);
    }

    public function test_website_section_images_require_permission_and_cannot_be_deleted_while_referenced(): void
    {
        $admin = User::query()->where('email', 'admin@example.test')->firstOrFail();
        $passenger = User::query()->where('email', 'passenger@example.test')->firstOrFail();
        $token = $this->tokenFor($admin);
        $image = $this->withToken($token)->post('/api/v1/admin/website-content/media', [
            'section' => 'hero', 'image' => UploadedFile::fake()->image('hero.png', 640, 360),
        ], ['Accept' => 'application/json'])->assertCreated();
        $path = $image->json('data.image_path');
        Storage::disk('public')->assertExists($path);
        $this->withToken($token)->getJson('/api/v1/admin/website-content/media')
            ->assertOk()->assertJsonFragment(['image_path' => $path]);
        $this->withToken($this->tokenFor($passenger))->getJson('/api/v1/admin/website-content/media')->assertForbidden();
        $this->withToken($this->tokenFor($passenger))->post('/api/v1/admin/website-content/media', [
            'section' => 'hero', 'image' => UploadedFile::fake()->image('blocked.png'),
        ], ['Accept' => 'application/json'])->assertForbidden();

        $content = ['sections' => [
            'hero' => ['image_url' => $image->json('data.image_url'), 'image_path' => $path],
            'tracking' => ['image_url' => $image->json('data.image_url'), 'image_path' => $path],
        ], 'faqs' => []];
        $this->withToken($token)->putJson('/api/v1/admin/website-content/publish', $content)->assertOk();
        $this->withToken($token)->deleteJson('/api/v1/admin/website-content/media', ['image_path' => $path])->assertStatus(409);
        $content['sections']['hero']['image_url'] = null;
        $content['sections']['hero']['image_path'] = null;
        $this->withToken($token)->putJson('/api/v1/admin/website-content/publish', $content)->assertOk();
        $this->withToken($token)->deleteJson('/api/v1/admin/website-content/media', ['image_path' => $path])->assertStatus(409);
        $content['sections']['tracking']['image_url'] = null;
        $content['sections']['tracking']['image_path'] = null;
        $this->withToken($token)->putJson('/api/v1/admin/website-content/publish', $content)->assertOk();
        $this->withToken($token)->deleteJson('/api/v1/admin/website-content/media', ['image_path' => $path])->assertOk();
        Storage::disk('public')->assertMissing($path);
    }

    private function tokenFor(User $user): string
    {
        $plain = Str::random(64);
        ApiToken::query()->create([
            'user_id' => $user->id, 'token_hash' => hash('sha256', $plain),
            'name' => 'website-cms-test', 'expires_at' => now()->addHour(),
        ]);
        return $plain;
    }
}
