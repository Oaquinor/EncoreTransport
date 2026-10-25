<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class WebsiteContentController extends Controller
{
    private const SECTIONS = ['hero', 'tracking', 'routes', 'faq', 'about', 'contact', 'final_cta'];
    private const FIELDS = ['title', 'subtitle', 'description', 'button_label', 'button_url', 'image_url', 'image_path', 'enabled', 'order'];

    public function published()
    {
        $value = DB::table('app_settings')->where('key', 'website.content.published')->value('value');
        $content = $value ? json_decode($value, true) : [];
        return response()->json(['data' => is_array($content) ? $content : null]);
    }

    public function draft()
    {
        $value = DB::table('app_settings')->where('key', 'website.content.draft')->value('value');
        $draft = $value ? json_decode($value, true) : null;
        $published = $this->published()->getData(true)['data'] ?? [];
        return response()->json(['data' => [
            'draft' => is_array($draft) ? $draft : $published,
            'published' => $published,
        ]]);
    }

    public function media()
    {
        $disk = Storage::disk('public');
        $files = $disk->allFiles('website-media');
        $items = array_map(fn (string $path) => [
            'image_path' => $path,
            'image_url' => '/storage/'.$path,
            'size' => $disk->size($path),
            'updated_at' => $disk->lastModified($path),
        ], $files);
        usort($items, fn (array $a, array $b) => $b['updated_at'] <=> $a['updated_at']);
        $items = array_slice($items, 0, 200);
        return response()->json(['data' => $items]);
    }

    public function saveDraft(Request $request, AuditService $audit)
    {
        $content = $this->validatedContent($request);
        $this->store('website.content.draft', $content);
        $audit->record($request->user(), 'website.content_draft_saved', null);
        return response()->json(['data' => $content]);
    }

    public function publish(Request $request, AuditService $audit)
    {
        $content = $this->validatedContent($request);
        $this->store('website.content.draft', $content);
        $this->store('website.content.published', $content);
        $audit->record($request->user(), 'website.content_published', null);
        return response()->json(['data' => $content]);
    }

    public function uploadMedia(Request $request)
    {
        $data = $request->validate([
            'section' => ['required', 'string', 'in:hero,tracking,routes,faq,about,contact,final_cta'],
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $path = $data['image']->store('website-media/'.$data['section'], 'public');
        if (!$path) abort(500, 'The website image could not be stored.');
        return response()->json(['data' => ['image_path' => $path, 'image_url' => '/storage/'.$path]], 201);
    }

    public function deleteMedia(Request $request)
    {
        $data = $request->validate(['image_path' => ['required', 'string', 'max:500']]);
        $path = $data['image_path'];
        if (!str_starts_with($path, 'website-media/') || str_contains($path, '..')) {
            throw ValidationException::withMessages(['image_path' => 'Only website media files can be removed.']);
        }
        foreach (['website.content.draft', 'website.content.published'] as $key) {
            $value = DB::table('app_settings')->where('key', $key)->value('value');
            $content = $value ? json_decode($value, true) : [];
            foreach (($content['sections'] ?? []) as $section) {
                if (($section['image_path'] ?? null) === $path) {
                    return response()->json(['message' => 'Remove this image from all website sections and publish the change before deleting its file.'], 409);
                }
            }
        }
        Storage::disk('public')->delete($path);
        return response()->json(['message' => 'Website image removed.']);
    }

    private function validatedContent(Request $request): array
    {
        $data = $request->validate([
            'sections' => ['required', 'array'],
            'sections.*' => ['required', 'array'],
            'sections.*.title' => ['sometimes', 'nullable', 'string', 'max:180'],
            'sections.*.subtitle' => ['sometimes', 'nullable', 'string', 'max:240'],
            'sections.*.description' => ['sometimes', 'nullable', 'string', 'max:1200'],
            'sections.*.button_label' => ['sometimes', 'nullable', 'string', 'max:80'],
            'sections.*.button_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'sections.*.image_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'sections.*.image_path' => ['sometimes', 'nullable', 'string', 'max:500'],
            'sections.*.enabled' => ['sometimes', 'boolean'],
            'sections.*.order' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'faqs' => ['sometimes', 'array', 'max:30'],
            'faqs.*.question' => ['required_with:faqs', 'string', 'max:240'],
            'faqs.*.answer' => ['required_with:faqs', 'string', 'max:1200'],
            'faqs.*.enabled' => ['sometimes', 'boolean'],
        ]);
        foreach (array_keys($data['sections']) as $key) {
            if (!in_array($key, self::SECTIONS, true)) {
                throw ValidationException::withMessages(['sections' => 'This website section is not editable.']);
            }
        }
        foreach ($data['sections'] as $key => $fields) {
            $data['sections'][$key] = array_intersect_key($fields, array_flip(self::FIELDS));
            foreach (['button_url', 'image_url'] as $urlField) {
                $url = $data['sections'][$key][$urlField] ?? null;
                $localPath = $url && str_starts_with($url, '/') && !str_starts_with($url, '//');
                if ($url && !$localPath && !str_starts_with($url, '#') && !preg_match('/^https:\/\//i', $url)) {
                    throw ValidationException::withMessages(["sections.$key.$urlField" => 'Use a site path, section link, or secure HTTPS URL.']);
                }
            }
            if (!empty($data['sections'][$key]['image_path'])
                && !str_starts_with($data['sections'][$key]['image_path'], 'website-media/')) {
                throw ValidationException::withMessages(["sections.$key.image_path" => 'Choose an image uploaded for this website section.']);
            }
        }
        $data['faqs'] = array_values(array_map(fn ($faq) => [
            'question' => $faq['question'], 'answer' => $faq['answer'], 'enabled' => (bool) ($faq['enabled'] ?? true),
        ], $data['faqs'] ?? []));
        return $data;
    }

    private function store(string $key, array $value): void
    {
        DB::table('app_settings')->updateOrInsert(
            ['key' => $key], ['value' => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 'updated_at' => now(), 'created_at' => now()],
        );
    }
}
