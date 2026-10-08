<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Models\ApiToken;
use App\Models\User;
use App\Services\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    #[OA\Post(path:'/api/v1/auth/login',operationId:'login',summary:'Iniciar sesion',tags:['Authentication'],responses:[new OA\Response(response:200,description:'Sesion iniciada'),new OA\Response(response:422,description:'Credenciales invalidas')])]
    public function login(LoginRequest $request)
    {
        $user=User::query()->where('email',$request->input('email'))->first();
        if(!$user || !$user->active || !Hash::check((string)$request->input('password'),$user->password)) {
            return response()->json(['message'=>'Invalid credentials.'],422);
        }
        $plain=Str::random(80);
        $token=ApiToken::query()->create(['user_id'=>$user->id,'name'=>'api','token_hash'=>hash('sha256',$plain),'expires_at'=>now()->addDays(30)]);
        $this->audit->record($user,'auth.login',$token);
        return response()->json(['token'=>$plain,'token_type'=>'Bearer','expires_at'=>$token->expires_at,'user'=>$user]);
    }

    public function me(Request $request) { return response()->json(['user'=>$request->user()]); }

    public function logout(Request $request)
    {
        $token=$request->attributes->get('api_token');
        $this->audit->record($request->user(),'auth.logout',$token);
        $token?->delete();
        return response()->json(['message'=>'Logged out.']);
    }
}
