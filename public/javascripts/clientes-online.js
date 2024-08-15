$(document).ready(function () {
    const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

    const comparer = (idx, asc) => (a, b) => ((v1, v2) =>
        v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

    // do the work...
    document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
        const table = th.closest('table');
        Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
            .forEach(tr => $('#clientes-lista').append(tr));
    })));

    $('#input-condo').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function (query, callback) {
                fetch(`api/v4/group?query=${query}`).then(response => response.json()).then(data => {
                    callback(data);
                });
            }
        }
    });

    $('.bloco-item').click(function () {
        let val = $(this).data('id');
        $('#input-bloco-value').val(val);
        $('#main-form').submit();
    });

    $('#input-condo').on('autocomplete.select', function (e, item) {
        localStorage['groupId'] = item.value;
        listaClientes();
    });
});

function listaClientes() {
    fetch(`api/v4/client/group/${localStorage['groupId']}`).then(response => response.json()).then(clients => {
        let html = template`<tr style="font-size: small;">
                                <td>${'status'}</td>
                                <td>${'codigo'}</td> 
                                <td>${'complemento'}</td> 
                                <td>${'ip'}</td> 
                                <td>${'uptime'}</td> 
                                <td>${'downtime'}</td> 
                            </tr>`;
        $('#clientes-lista').empty();
        $('#clientes-lista').append('<tr></tr>');

        for (const client of clients) {
            fetch(`api/v4/radius/${client.Codigo}`).then(function(response) {
                switch (response.status) {
                    case 200:
                        return response.json();
                    case 404:
                        return null;
                }
            }).then(data => {
                $('#clientes-lista').append(html({
			status: data.Status ? 'ONLINE' : 'OFFLINE',
                    codigo: client.Codigo,
                    complemento: client.Complemento,
                    ip: data.IP ?? 'N/A',
                    uptime: data.Login ?? 'N/A',
                    downtime: data.Logout ?? 'N/A'
                }));
            });
        }
    });
}
