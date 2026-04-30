@props(['url'])
<tr>
    <td class="header">
        <a href="{{ $url }}" style="display: inline-block; text-decoration: none; color: #3d4852; font-size: 19px; font-weight: bold;">
            {{-- Intenta cargar el logo solo si la APP_URL no es localhost --}}
            @if(config('app.url') !== 'http://localhost' && file_exists(public_path('images/CNE-logo.png')))
                <img src="{{ asset('images/CNE-logo.png') }}" class="logo" alt="{{ config('app.name') }}" style="height: 50px;">
            @else
                {{-- Si estás en local, muestra el nombre del sistema --}}
                {{ config('app.name') }}
            @endif
        </a>
    </td>
</tr>
