<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiActionLog;
use App\Services\Assistant\AssistantToolPolicy;
use App\Services\Assistant\ToolRegistry;
use App\Services\Auth\PermissionService;
use Illuminate\Http\Request;

class AssistantController extends Controller
{
    public function __construct(private readonly ToolRegistry $registry, private readonly AssistantToolPolicy $policy, private readonly PermissionService $permissions) {}

    public function tools() { return response()->json(['data'=>$this->registry->definitions()]); }

    public function execute(Request $request, string $tool)
    {
        $input = $request->validate(['input'=>['sometimes','array'],'session_id'=>['nullable','string','max:128'],'channel'=>['nullable','string','max:32']]);
        $definition = $this->registry->get($tool);
        $user = $request->user();
        $allowed = $this->policy->authorize($user, $definition->name(), $definition->risk(), $definition->requiredPermission());
        $log = ['agent'=>'encore','channel'=>$input['channel'] ?? 'api','user_id'=>$user->id,'role'=>$user->role,'permissions'=>$this->permissions->effective($user),'session_id'=>$input['session_id'] ?? null,'tool'=>$definition->name(),'arguments'=>$this->sanitizeForAudit($input['input'] ?? []),'confirmation_required'=>in_array($definition->risk(), [AssistantToolPolicy::CONFIRMATION_REQUIRED, AssistantToolPolicy::HIGH_RISK], true)];
        if (!$allowed) { $log['error']='Assistant tool forbidden.'; AiActionLog::query()->create($log); return response()->json(['message'=>'Assistant tool forbidden.'], 403); }
        $result = $definition->execute($user, $input['input'] ?? []);
        $log['result'] = $this->sanitizeForAudit($result); AiActionLog::query()->create($log);
        return response()->json(['data'=>$result]);
    }

    private function sanitizeForAudit(mixed $value, int $depth = 0): mixed
    {
        if ($depth > 5) return '[truncated]';
        if (is_array($value)) {
            $safe = [];
            foreach ($value as $key => $item) {
                $normalized = strtolower((string) $key);
                $safe[$key] = preg_match('/pass(word|phrase)?|token|secret|api[_-]?key|authorization|cookie|card|cvv|cvc/i', $normalized)
                    ? '[redacted]'
                    : $this->sanitizeForAudit($item, $depth + 1);
            }
            return $safe;
        }
        if (is_string($value)) return mb_substr($value, 0, 2000);
        if (is_scalar($value) || $value === null) return $value;
        return '[redacted]';
    }
}
