let cart = [];
let index = 0;
let allUsers = [];
let allProducts = [];
let allCategories = [];
let allTransactions = [];
let sold = [];
let state = [];
let sold_items = [];
let item;
let auth;
let holdOrder = 0;
let holdOrderRev = 0;
let vat = 0;
let perms = null;
let deleteId = 0;
let receipt = '';
let totalVat = 0;
let subTotal = 0;
let method = '';
let order_index = 0;
let user_index = 0;
let product_index = 0;
let transaction_index;
let host = 'localhost';
let path = require('path');
let port = '8001';
let moment = require('moment');
let Swal = require('sweetalert2');
let { ipcRenderer } = require('electron');
let dotInterval = setInterval(function () { $(".dot").text('.') }, 3000);
let Store = require('electron-store');
const remote = require('electron').remote;
const app = remote.app;
let api = 'http://' + host + ':' + port + '/api/';
let btoa = require('btoa');
let jsPDF = require('jspdf');
let html2canvas = require('html2canvas');
let JsBarcode = require('jsbarcode');
let macaddress = require('macaddress');
const { exit } = require('process');
let categories = [];
let holdOrderList = [];
let customerOrderList = [];
let ownUserEdit = null;
let totalPrice = 0;
let orderTotal = 0;
let auth_error = 'Nombre de usuario o contraseña incorrecta';
let auth_empty = 'Por favor ingrese un nombre de usuario y contraseña';
let holdOrderlocation = $("#randerHoldOrders");
let customerOrderLocation = $("#randerCustomerOrders");
let storage = new Store();
let settings;
let platform;
let user = {};
let start = moment().startOf('month');
// let end = moment(moment().format('YYYY-MM-DD 23:59:59'));
let end = moment().endOf('month');
let start_date = moment(start).toDate();
let end_date = moment(end).toDate();
let by_till = 0;
let by_user = 0;
let by_status = 1;

$(function () {

    function cb(start, end) {
        $('#reportrange span').html(start.format('MMMM D, YYYY') + '  -  ' + end.format('MMMM D, YYYY'));
    }

    $('#reportrange').daterangepicker({
        startDate: start,
        endDate: end,
        timeZone: 'America/Lima',
        autoApply: true,
        timePicker: true,
        timePicker24Hour: true,
        timePickerIncrement: 10,
        timePickerSeconds: true,
        // minDate: '',
        ranges: {
            'Today': [moment().startOf('day'), moment()],
            'Yesterday': [moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day')],
            'Last 7 Days': [moment().subtract(6, 'days').startOf('day'), moment().endOf('day')],
            'Last 30 Days': [moment().subtract(29, 'days').startOf('day'), moment().endOf('day')],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'This Month': [moment().startOf('month'), moment()],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        }
    }, cb);

    cb(start, end);

});


$.fn.serializeObject = function () {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function () {
        if (o[this.name]) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};


auth = storage.get('auth');
user = storage.get('user');

if (auth == undefined) {
    $.get(api + 'users/check/', function (data) { });
    $("#loading").show();
    authenticate();

} else {

    // $('#loading').show();

    $('#loading').hide();
    // setTimeout(function () {
    // }, 2000);

    platform = storage.get('settings') || {};

    if (platform != undefined) {

        if (platform.app == 'Network Point of Sale Terminal') {
            api = 'http://' + platform.ip + ':' + port + '/api/';
            perms = true;
        }
    }

    $.get(api + 'users/user/' + user._id, function (data) {
        user = data;
        $('#loggedin-user').text(user.fullname);
    }).fail(function(err) {
        storage.delete('auth');
        storage.delete('user');
        
        ipcRenderer.send('app-reload', '');
        // $("#loading").show();
        // authenticate();
        console.log(err);
    });


    $.get(api + 'settings/all', function (data) {
        settings = data.settings;
        
        if (data._attachments && data._attachments.logo) {
           settings.logo = 'data:' + data._attachments.logo.content_type + ';base64,' + data._attachments.logo.data;
        }
    });

    $.get(api + 'users/all', function (users) {
        allUsers = [...users];
    });

    $(document).ready(function () {

        $(".loading").hide();

        loadCategories();
        loadProducts();
        loadCustomers();


        if (settings && settings.symbol) {
            $("#price_curr, #payment_curr, #change_curr").text(settings.symbol);
        }


        setTimeout(function () {
            if (!settings && auth) {
                $('#settingsModal').modal('show');
            }
            else {
                vat = parseFloat(settings.percentage);
                $("#taxInfo").text(settings.charge_tax ? vat : 0);
            }

        }, 1500);



        $("#settingsModal").on("hide.bs.modal", function () {

            setTimeout(function () {
                if (!settings  && auth) {
                    $('#settingsModal').modal('show');
                }
            }, 1000);

        });


        if (0 == user.perm_products) { $(".p_one").hide() };
        if (0 == user.perm_categories) { $(".p_two").hide() };
        if (0 == user.perm_transactions) { $(".p_three").hide() };
        if (0 == user.perm_users) { $(".p_four").hide() };
        if (0 == user.perm_settings) { $(".p_five").hide() };

        function loadProducts() {

            $.get(api + 'inventory/products', function (data) {
                
                data.forEach(item => {
                    item = item.doc;
                    item.price = parseFloat(item.price).toFixed(2);

                    if (item._attachments && item._attachments.image) {
                        item.image = 'data:' + item._attachments.image.content_type + ';base64,' + item._attachments.image.data;
                    }
                });

                allProducts = [...data];

                loadProductList();

                $('#parent').text('');
                $('#categories').html(`<button type="button" id="all" class="btn btn-categories btn-white waves-effect waves-light">Todos</button> `);

                data.forEach(item => {
                    item = item.doc;
                    if (!categories.includes(item.category)) {
                        categories.push(item.category);
                    }

                    let item_info = `<div class="col-lg-2 box ${item.category}"
                                onclick="$(this).addToCart(${item._id}, ${item.quantity}, ${item.stock})">
                            <div class="widget-panel widget-style-2 ">                    
                            <div id="image"><img src="${item.image}" id="product_img" alt=""></div>                    
                                        <div class="text-muted m-t-5 text-center">
                                        <div class="name" id="product_name">${item.name}</div> 
                                        <span class="sku">${item.sku}</span>
                                        <span class="stock">STOCK </span><span class="count">${item.stock == 1 ? item.quantity : 'N/A'}</span></div>
                                        <sp class="text-success text-center"><b data-plugin="counterup">${settings.symbol}  ${item.price}</b> </sp>
                            </div>
                        </div>`;
                    $('#parent').append(item_info);
                });

                categories.forEach(category => {
                    let c = allCategories.filter(function (ctg) {
                        return ctg.id == category;
                    })

                    $('#categories').append(`<button type="button" id="${category}" class="btn btn-categories btn-white waves-effect waves-light">${c.length > 0 ? c[0].doc.name : ''}</button> `);
                });

            });

        }

        function loadCategories() {
            $.get(api + 'categories/all', function (data) {
                allCategories = data;
                loadCategoryList();
                $('#category').html(`<option value="0">Select</option>`);
                allCategories.forEach(category => {
                    $('#category').append(`<option value="${category.id}">${category.doc.name}</option>`);
                });
            });
        }

        function loadCustomers() {

            $.get(api + 'customers/all', function (customers) {
                
                $('#customer').html(`<option value="" selected="selected">Seleccione un cliente</option>`);

                customers.forEach(cust => {
                    cust = cust.doc;
                    cust.id = cust._id;

                    let customer = `<option value='${JSON.stringify(cust)}'>${cust.document_type.number + ' - ' + cust.name}</option>`;
                    $('#customer').append(customer);
                });
                $('#customer').selectpicker('refresh');

                //  $('#customer').chosen();

            });

        }


        $.fn.addToCart = function (id, count, stock) {

            if (stock == 1) {
                if (count > 0) {
                    $.get(api + 'inventory/product/' + id, function (data) {
                        $(this).addProductToCart(data);
                    });
                }
                else {
                    Swal.fire(
                        '¡Agotado!',
                        'Este artículo no está disponible actualmente',
                        'info'
                    );
                }
            }
            else {
                $.get(api + 'inventory/product/' + id, function (data) {
                    $(this).addProductToCart(data);
                });
            }

        };


        function barcodeSearch(e) {

            e.preventDefault();
            $("#basic-addon2").empty();
            $("#basic-addon2").append(
                $('<i>', { class: 'fa fa-spinner fa-spin' })
            );

            let req = {
                skuCode: $("#skuCode").val()
            }
            
            $.ajax({
                url: api + 'inventory/product/sku',
                type: 'POST',
                data: JSON.stringify(req),
                contentType: 'application/json; charset=utf-8',
                cache: false,
                processData: false,
                success: function (data) {
                    if (data._id != undefined && data.quantity >= 1) {
                        $(this).addProductToCart(data);
                        $("#searchBarCode").get(0).reset();
                        $("#basic-addon2").empty();
                        $("#basic-addon2").append(
                            $('<i>', { class: 'glyphicon glyphicon-ok' })
                        )
                    }
                    else if (data.quantity < 1) {
                        Swal.fire(
                            '¡Agotado!',
                            'Este artículo no está disponible actualmente',
                            'info'
                        );
                    }
                    else {

                        Swal.fire(
                            '¡No encontrado!',
                            '<b>' + $("#skuCode").val() + '</b> no es un código de barras válido.',
                            'warning'
                        );

                        $("#searchBarCode").get(0).reset();
                        $("#basic-addon2").empty();
                        $("#basic-addon2").append(
                            $('<i>', { class: 'glyphicon glyphicon-ok' })
                        )
                    }

                }
                // error: function (data) {
                //     
                // }
            }).fail( function( jqXHR, textStatus, errorThrown ) {

                if (jqXHR.status === 500) {
                    // $(this).showValidationError(data);
                    // $("#basic-addon2").append(
                    //     $('<i>', { class: 'glyphicon glyphicon-remove' })
                    // )

                    Swal.fire(
                        '¡No encontrado!',
                        '<b>' + $("#skuCode").val() + '</b> no es un código de barras válido.',
                        'warning'
                    );

                    $("#searchBarCode").get(0).reset();
                    $("#basic-addon2").empty();
                    $("#basic-addon2").append(
                        $('<i>', { class: 'glyphicon glyphicon-ok' })
                    )

                }
                // else if (jqXHR.status === 404) {
                //     $("#basic-addon2").empty();
                //     $("#basic-addon2").append(
                //         $('<i>', { class: 'glyphicon glyphicon-remove' })
                //     )
                // }
                // else {
                //     $(this).showServerError();
                //     $("#basic-addon2").empty();
                //     $("#basic-addon2").append(
                //         $('<i>', { class: 'glyphicon glyphicon-warning-sign' })
                //     )
                // }
            });

        }


        $("#searchBarCode").on('submit', function (e) {
            barcodeSearch(e);
        });



        $('body').on('click', '#jq-keyboard button', function (e) {
            let pressed = $(this)[0].className.split(" ");
            if ($("#skuCode").val() != "" && pressed[2] == "enter") {
                barcodeSearch(e);
            }
        });



        $.fn.addProductToCart = function (data) {
            item = {
                id: data._id,
                product_name: data.name,
                sku: data.sku,
                price: parseFloat(data.price),
                quantity: 1
            };

            // actualizar el precio en caso esté incluido el igv
            if (settings.charge_tax && settings.price_with_tax) {
                item.price = parseFloat((data.price / 1.18).toFixed(4));
            }

            if ($(this).isExist(item)) {
                $(this).qtIncrement(index);
            } else {
                cart.push(item);
                $(this).renderTable(cart)
            }
        }


        $.fn.isExist = function (data) {
            let toReturn = false;
            $.each(cart, function (index, value) {
                if (value.id == data.id) {
                    $(this).setIndex(index);
                    toReturn = true;
                }
            });
            return toReturn;
        }


        $.fn.setIndex = function (value) {
            index = value;
        }


        $.fn.calculateCart = function () {
            let total = 0;
            let grossTotal;
            $('#total').text(cart.length);
            $.each(cart, function (index, data) {
                total += data.quantity * data.price;
            });
            total = total - $("#inputDiscount").val();
            $('#price').text(settings.symbol + total.toFixed(2));

            subTotal = total;

            if ($("#inputDiscount").val() >= total) {
                $("#inputDiscount").val(0);
            }

            if (settings.charge_tax) {
                totalVat = ((total * vat) / 100);
                grossTotal = total + totalVat
            }

            else {
                grossTotal = total;
            }

            orderTotal = grossTotal.toFixed(2);

            $("#gross_price").text(settings.symbol + grossTotal.toFixed(2));
            $("#payablePrice").val(grossTotal.toFixed(2));
        };



        $.fn.renderTable = function (cartList) {
            $('#cartTable > tbody').empty();
            $(this).calculateCart();
            $.each(cartList, function (index, data) {
                $('#cartTable > tbody').append(
                    $('<tr>').append(
                        $('<td>', { text: index + 1 }),
                        $('<td>', { text: data.product_name }),
                        $('<td>').append(
                            $('<div>', { class: 'input-group' }).append(
                                $('<div>', { class: 'input-group-btn btn-xs' }).append(
                                    $('<button>', {
                                        class: 'btn btn-default btn-xs',
                                        onclick: '$(this).qtDecrement(' + index + ')'
                                    }).append(
                                        $('<i>', { class: 'fa fa-minus' })
                                    )
                                ),
                                $('<input>', {
                                    class: 'form-control',
                                    type: 'number',
                                    value: data.quantity,
                                    onInput: '$(this).qtInput(' + index + ')'
                                }),
                                $('<div>', { class: 'input-group-btn btn-xs' }).append(
                                    $('<button>', {
                                        class: 'btn btn-default btn-xs',
                                        onclick: '$(this).qtIncrement(' + index + ')'
                                    }).append(
                                        $('<i>', { class: 'fa fa-plus' })
                                    )
                                )
                            )
                        ),
                        $('<td>', { text: settings.symbol + (data.price * data.quantity).toFixed(2) }),
                        $('<td>').append(
                            $('<button>', {
                                class: 'btn btn-danger btn-xs',
                                onclick: '$(this).deleteFromCart(' + index + ')'
                            }).append(
                                $('<i>', { class: 'fa fa-times' })
                            )
                        )
                    )
                )
            })
        };


        $.fn.deleteFromCart = function (index) {
            cart.splice(index, 1);
            $(this).renderTable(cart);
        }


        $.fn.qtIncrement = function (i) {

            item = cart[i];

            let product = allProducts.filter(function (selected) {
                return selected.doc._id == parseInt(item.id);
            });
      
            if (product[0].doc.stock == 1) {
                if (item.quantity < product[0].doc.quantity) {
                    item.quantity += 1;
                    $(this).renderTable(cart);
                }

                else {
                    Swal.fire(
                        '¡No hay más existencias!',
                        'Ya has añadido todo el stock disponible.',
                        'info'
                    );
                }
            }
            else {
                item.quantity += 1;
                $(this).renderTable(cart);
            }

        }


        $.fn.qtDecrement = function (i) {
            if (item.quantity > 1) {
                item = cart[i];
                item.quantity -= 1;
                $(this).renderTable(cart);
            }
        }


        $.fn.qtInput = function (i) {
            item = cart[i];
            item.quantity = $(this).val();
            $(this).renderTable(cart);
        }


        $.fn.cancelOrder = function () {

            if (cart.length > 0) {
                Swal.fire({
                    title: '¿Está seguro?',
                    text: "Está a punto de eliminar todos los artículos del carrito.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: '¡Sí, límpialo!'
                }).then((result) => {

                    if (result.value) {

                        cart = [];
                        $(this).renderTable(cart);
                        holdOrder = 0;

                        Swal.fire(
                            '¡Limpiado!',
                            'Todos los elementos han sido eliminados.',
                            'success'
                        )
                    }
                });
            }

        }


        $("#payButton").on('click', function () {
            if (!$("#customer").val()) {
                Swal.fire(
                    '¡Uy!',
                    '¡Debe seleccionar un cliente!',
                    'warning'
                );

                return;
            }

            if (cart.length != 0) {
                $("#paymentModel").modal('toggle');
            } else {
                Swal.fire(
                    '¡Uy!',
                    '¡No hay nada que pagar!',
                    'warning'
                );
            }

        });


        $("#hold").on('click', function () {

            if (cart.length != 0) {

                $("#dueModal").modal('toggle');
            } else {
                Swal.fire(
                    '¡Uy!',
                    '¡No hay nada en espera!',
                    'warning'
                );
            }
        });


        function printJobComplete() {
            alert("print job complete");
        }


        $.fn.submitDueOrder = function (status) {

            let items = "";
            let payment = 0;

            cart.forEach(item => {

                items += "<tr><td>" + item.product_name + "</td><td>" + item.quantity + "</td><td>" + settings.symbol + parseFloat(item.price).toFixed(2) + "</td></tr>";

            });

            let currentTime = new Date(moment());

            let discount = $("#inputDiscount").val();
            let customer = $("#customer").val() ? JSON.parse($("#customer").val()) : {};
            let date = moment(currentTime).format("YYYY-MM-DD HH:mm:ss");
            let paid = $("#payment").val() == "" ? "" : parseFloat($("#payment").val()).toFixed(2);
            let change = $("#change").text() == "" ? "" : parseFloat($("#change").text()).toFixed(2);
            let refNumber = $("#refNumber").val();
            let orderNumber = holdOrder;
            let paymentType = JSON.parse($("#paymentType").val())
            let type = paymentType.name;
            let tax_row = "";
            let documentType = JSON.parse($("#documentType").val())

            if (paid != "") {
                payment = `<tr>
                        <td>Pagado</td>
                        <td>:</td>
                        <td>${settings.symbol + paid}</td>
                    </tr>
                    <tr>
                        <td>Vuelto</td>
                        <td>:</td>
                        <td>${settings.symbol + Math.abs(change).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Método</td>
                        <td>:</td>
                        <td>${type}</td>
                    </tr>`
            }



            if (settings.charge_tax) {
                tax_row = `<tr>
                    <td>IGV(${settings.percentage})% </td>
                    <td>:</td>
                    <td>${settings.symbol}${parseFloat(totalVat).toFixed(2)}</td>
                </tr>`;
            }



            if (status === 0) {
                if ($("#customer").val() == 0 && $("#refNumber").val() == "") {
                Swal.fire(
                    '¡Referencia requerida!',
                    '¡Debe seleccionar un cliente <br> o ingrese una referencia!',
                    'warning'
                    )
                    
                    return;
                }

                documentType = {};
            }


            $(".loading").show();


            if (holdOrder != 0) {

                orderNumber = holdOrder;
                method = 'PUT'
            }
            else {
                orderNumber = Math.floor(Date.now() / 1000);
                method = 'POST'
            }


            receipt = `<div style="font-size: 10px;">                            
        <p style="text-align: center;">
        ${settings.img == "" ? settings.img : '<img style="max-width: 50px;max-width: 100px;" src ="' + settings.logo + '" /><br>'}
            <span style="font-size: 22px;">${settings.legal_name}</span> <br>
            ${settings.address.street} ${settings.address.district} ${settings.address.city} ${settings.address.state}<br>
            ${settings.contact != '' ? 'Teléfono: ' + settings.contact + '<br>' : ''} 
            ${settings.vat_no != '' ? 'RUC ' + settings.vat_no + '<br>' : ''} 
            ${documentType.name ? '<span style="font-size: 15px; text-transform: uppercase;">' + documentType.name + '</span> <br />' : ''}
            <span style="font-size: 15px; text-transform: uppercase;" id="serieCorrelativo"></span> <br />

        </p>
        <hr>
        <left>
            <p>
            Pedido No : ${orderNumber} <br>
            <!--Ref No : ${refNumber == "" ? orderNumber : refNumber} <br>-->
            Cliente : ${customer.name || ''} <br>
            Cajero : ${user.fullname} <br>
            Fecha : ${date}<br>
            </p>

        </left>
        <hr>
        <table width="100%">
            <thead style="text-align: left;">
            <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Precio</th>
            </tr>
            </thead>
            <tbody>
            ${items}                
     
            <tr>                        
                <td><b>Subtotal</b></td>
                <td>:</td>
                <td><b>${settings.symbol}${parseFloat(subTotal).toFixed(2)}</b></td>
            </tr>
            <!--<tr>
                <td>Descuento</td>
                <td>:</td>
                <td>${discount > 0 ? settings.symbol + parseFloat(discount).toFixed(2) : ''}</td>
            </tr>-->
            
            ${tax_row}
        
            <tr>
                <td><h3>Total</h3></td>
                <td><h3>:</h3></td>
                <td>
                    <h3>${settings.symbol}${parseFloat(orderTotal).toFixed(2)}</h3>
                </td>
            </tr>
            ${payment == 0 ? '' : payment}
            </tbody>
            </table>
            <br>
            <hr>
            <br>
            <p style="text-align: center;">
             ${settings.footer}
             </p>
            </div>`;


            if (status == 3) {
                if (cart.length > 0) {

                    printJS({ printable: receipt, type: 'raw-html' });

                    $(".loading").hide();
                    return;

                }
                else {

                    $(".loading").hide();
                    return;
                }
            }

            if ($('#paymentInfo').val()) {
                paymentType.info = $('#paymentInfo').val();
            }


            let data = {
                order: orderNumber,
                ref_number: refNumber,
                discount: discount,
                customer: customer,
                status: status,
                subtotal: parseFloat(parseFloat(subTotal).toFixed(4)),
                tax: parseFloat(totalVat.toFixed(4)),
                order_type: 1,
                items: cart,
                date: currentTime,
                payment_type: paymentType,
                total: parseFloat(orderTotal),
                paid: parseFloat(paid),
                change: parseFloat(change),
                _id: orderNumber,
                till: platform.till,
                mac: platform.mac,
                user: user.fullname,
                user_id: user._id,
                document_type: documentType,
            }
           
            if (holdOrderRev) {
                data._rev = holdOrderRev
            }

            $.ajax({
                url: api + 'transactions/new',
                type: method,
                data: JSON.stringify(data),
                contentType: 'application/json; charset=utf-8',
                cache: false,
                processData: false,
                success: function (data) {
                    if (data.document_type.code === '01' || data.document_type.code === '03') {
                        // obtener qr
                        try {
                            $.get(api + 'transactions/' + data._id + '/qr', function(data){
                                // $('#viewTransaction table').after('<br /><div style="text-align: center;">' + data + '</div>')
                                $('#viewTransaction table').after('<br /><div style="text-align: center;"><img src="' + data + '" /></div>')
                                receipt += '<br /><div style="text-align: center;">' + data + '</div>';
                            });
                        } catch (error) {
                            console.log(error)
                        }
                    } 
            
                    cart = [];
                    $('#viewTransaction').html('');
                    $('#viewTransaction').html(receipt);
                    // insertar correlativo
                    if (data.serie && data.correlative) {
                        $('#serieCorrelativo').html('<b>' + data.serie + '-' + data.correlative + '</b>');
                    }
                    $('#orderModal').modal('show');
                    loadProducts();
                    loadCustomers();
                    $(".loading").hide();
                    $("#dueModal").modal('hide');
                    $("#paymentModel").modal('hide');
                    $(this).getHoldOrders();
                    $(this).getCustomerOrders();
                    $(this).renderTable(cart);

                    loadTransactions();

                }, error: function (data) {
                    $(".loading").hide();
                    Swal.fire(
                        '¡Error!',
                        'Error al intentar crear la venta: ' + data.responseText,
                        'error'
                    );
                }
            });

            $("#refNumber").val('');
            $("#change").text('');
            $("#payment").val('');

        }


        $.get(api + 'transactions/on-hold', function (data) {
            holdOrderList = data.docs;
            holdOrderlocation.empty();
            clearInterval(dotInterval);
            $(this).randerHoldOrders(holdOrderList, holdOrderlocation, 1);
        });


        $.fn.getHoldOrders = function () {
            $.get(api + 'transactions/on-hold', function (data) {
                holdOrderList = data.docs;
                clearInterval(dotInterval);
                holdOrderlocation.empty();
                $(this).randerHoldOrders(holdOrderList, holdOrderlocation, 1);
            });
        };


        $.fn.randerHoldOrders = function (data, renderLocation, orderType) {
    
            $.each(data, function (index, order) {
                $(this).calculatePrice(order);
                renderLocation.append(
                    $('<div>', { class: orderType == 1 ? 'col-md-3 order' : 'col-md-3 customer-order' }).append(
                        $('<a>').append(
                            $('<div>', { class: 'card-box order-box' }).append(
                                $('<p>').append(
                                    $('<b>', { text: 'Ref :' }),
                                    $('<span>', { text: order.ref_number, class: 'ref_number' }),
                                    $('<br>'),
                                    $('<b>', { text: 'Precio :' }),
                                    $('<span>', { text: order.total, class: "label label-info", style: 'font-size:14px;' }),
                                    $('<br>'),
                                    $('<b>', { text: 'Productos :' }),
                                    $('<span>', { text: order.items.length }),
                                    $('<br>'),
                                    $('<b>', { text: 'Cliente :' }),
                                    $('<span>', { text: order.customer != 0 ? order.customer.name : 'Seleccionar un cliente', class: 'customer_name' })
                                ),
                                $('<button>', { class: 'btn btn-danger del', onclick: '$(this).deleteOrder(' + index + ',' + orderType + ')' }).append(
                                    $('<i>', { class: 'fa fa-trash' })
                                ),

                                $('<button>', { class: 'btn btn-default', onclick: '$(this).orderDetails(' + index + ',' + orderType + ')' }).append(
                                    $('<span>', { class: 'fa fa-shopping-basket' })
                                )
                            )
                        )
                    )
                )
            })
        }


        $.fn.calculatePrice = function (data) {
            totalPrice = 0;
            $.each(data.products, function (index, product) {
                totalPrice += product.price * product.quantity;
            })

            let vat = (totalPrice * data.vat) / 100;
            totalPrice = ((totalPrice + vat) - data.discount).toFixed(0);

            return totalPrice;
        };


        $.fn.orderDetails = function (index, orderType) {

            $('#refNumber').val('');

            if (orderType == 1) {

                $('#refNumber').val(holdOrderList[index].ref_number);

                $("#customer option:selected").removeAttr('selected');

                $("#customer option").filter(function () {
                    return $(this).text() == "Seleccione un cliente";
                }).prop("selected", true);

                holdOrder = holdOrderList[index]._id;
                holdOrderRev = holdOrderList[index]._rev;
         
                cart = [];
                $.each(holdOrderList[index].items, function (index, product) {
                    item = {
                        id: product.id,
                        product_name: product.product_name,
                        sku: product.sku,
                        price: parseFloat(product.price),
                        quantity: parseFloat(product.quantity)
                    };
                    cart.push(item);
                })
            } else if (orderType == 2) {

                $('#refNumber').val('');

                $("#customer option:selected").removeAttr('selected');

                $("#customer option").filter(function () {
                    return $(this).text() == customerOrderList[index].customer.name;
                }).prop("selected", true);


                holdOrder = customerOrderList[index]._id;
                cart = [];
                $.each(customerOrderList[index].items, function (index, product) {
                    item = {
                        id: product.id,
                        product_name: product.product_name,
                        sku: product.sku,
                        price: parseFloat(product.price),
                        quantity: parseFloat(product.quantity)
                    };
                    cart.push(item);
                })
            }
            $(this).renderTable(cart);
            $("#holdOrdersModal").modal('hide');
            $("#customerModal").modal('hide');
        }


        $.fn.deleteOrder = function (index, type) {
            
            switch (type) {
                case 1: deleteId = holdOrderList[index]._id;
                    break;
                case 2: deleteId = customerOrderList[index]._id;
            }

            let data = {
                orderId: deleteId,
            }

            Swal.fire({
                title: "¿Eliminar pedido?",
                text: "Esto eliminará el pedido. ¡Estas seguro que quieres borrarlo!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: '¡Sí, bórralo!'
            }).then((result) => {
                
                if (result.value) {
                    $.ajax({
                        url: api + 'transactions/delete',
                        type: 'POST',
                        data: JSON.stringify(data),
                        contentType: 'application/json; charset=utf-8',
                        cache: false,
                        success: function (data) {

                            Swal.fire(
                                '¡Eliminado!',
                                '¡Has eliminado el pedido!',
                                'success'
                            )

                        }, error: function (data) {
                            $(".loading").hide();

                        }
                    });
                }
            })
            .then(() => {
                //volvemos a renderizar las ordenes 
                $(this).getHoldOrders();
                $(this).getCustomerOrders();
            })
        }



        $.fn.getCustomerOrders = function () {
            $.get(api + 'transactions/customer-orders', function (data) {
                clearInterval(dotInterval);
                customerOrderList = data.docs;
                customerOrderLocation.empty();
                $(this).randerHoldOrders(customerOrderList, customerOrderLocation, 2);
            });
        }



        $('#saveCustomer').on('submit', function (e) {

            e.preventDefault();
            let method = 'POST';

            let custData = {
                name: $('#userName').val(),
                phone: $('#phoneNumber').val(),
                email: $('#emailAddress').val(),
                document_type: {
                    code: $('#document_code').val(),
                    number:$('#document_number').val()
                },
                address: {
                    street: $('#customer_street').val(),
                    state: $('#customer_state').val(),
                    city: $('#customer_city').val(),
                    district: $('#customer_district').val(),
                    zip: $('#customer_zip').val(),
                }
            }

            if ($('#customer_id').val()) {
                method = 'PUT';
                custData.id = $('#customer_id').val();
            }

            $.ajax({
                url: api + 'customers/customer',
                type: method,
                data: JSON.stringify(custData),
                contentType: 'application/json; charset=utf-8',
                cache: false,
                processData: false,
                success: function (data) { // cuando se actualiza
                    $("#newCustomer").modal('hide');

                    if ($('#customer_id').val()) {
                        Swal.fire("¡Cliente actualizado!", "¡El cliente se actualizó con éxito!", "success");
                        $('#customer option:selected').replaceWith(
                            $('<option>', { text: data.document_type.number + ' - ' + data.name, value: `{"id": "${data._id}", "name": "${data.name}", "document_type": {"code": "${data.document_type.code}", "number": "${data.document_type.number}"}}`, selected: 'selected' })
                        );

                        $('#customer').selectpicker('refresh');
                    } else {

                        Swal.fire("¡Cliente agregado!", "¡El cliente se agregó con éxito!", "success");
                        $("#customer option:selected").removeAttr('selected');
                        $('#customer').append(
                            $('<option>', { text: data.document_type.number + ' - ' + data.name, value: `{"id": "${data._id}", "name": "${data.name}", "document_type": {"code": "${data.document_type.code}", "number": "${data.document_type.number}"}}`, selected: 'selected' })
                        );
    
                        $('#customer').val(`{"id": "${data._id}", "name": "${data.name}", "document_type": {"code": "${data.document_type.code}", "number": "${data.document_type.number}"}}`).trigger('chosen:updated');
                        
                        $('#customer').selectpicker('refresh');
                    }


                }, error: function (data) {
                    console.log(data)
                    // $("#newCustomer").modal('hide');
                    Swal.fire('Error', 'Algo salió mal. Por favor, vuelva a intentarlo.' + '<br>' + data.responseText, 'error')
                }
            })
        })


        $("#confirmPayment").hide();

        $("#cardInfo").hide();

        $("#payment").on('input', function () {
            $(this).calculateChange();
        });


        $("#confirmPayment").on('click', function () {
            if ($('#payment').val() == "") {
                Swal.fire(
                    '¡No!',
                    '¡Por favor, introduzca la cantidad que se pagó!',
                    'warning'
                );
            }
            else {
                $(this).submitDueOrder(1);
            }
        });


        $('#transactions').click(function () {
            loadTransactions();
            loadUserList();

            $('#pos_view').hide();
            $('#pointofsale').show();
            $('#transactions_view').show();
            $(this).hide();

        });


        $('#pointofsale').click(function () {
            $('#pos_view').show();
            $('#transactions').show();
            $('#transactions_view').hide();
            $(this).hide();
        });


        $("#viewRefOrders").click(function () {
            setTimeout(function () {
                $("#holdOrderInput").focus();
            }, 500);
        });


        $("#viewCustomerOrders").click(function () {
            setTimeout(function () {
                $("#holdCustomerOrderInput").focus();
            }, 500);
        });


        $('#newProductModal').click(function () {
            $('#saveProduct').get(0).reset();
            $('#current_img').text('');
            $('#saveProduct input[type=hidden').val('');
        });

        $('#newCategoryModal').click(function () {
            $('#saveCategory').get(0).reset();
            $('#saveCategory input[type=hidden').val('');
        });

        $('#newCustomerModal').click(function () {
            $('#saveCustomer').get(0).reset();
            $('#saveCustomer input[type=hidden').val('');
        });


        $('#saveProduct').submit(function (e) {
            e.preventDefault();

            $(this).attr('action', api + 'inventory/product');
            $(this).attr('method', 'POST');

            $(this).ajaxSubmit({
                contentType: 'application/json',
                success: function (response) {

                    $('#saveProduct').get(0).reset();
                    $('#current_img').text('');
                    $('#saveProduct input[type=hidden').val('');

                    loadProducts();
                    Swal.fire({
                        title: 'Producto guardado',
                        text: "Seleccione una opción a continuación para continuar.",
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Agrega otro',
                        cancelButtonText: 'Cerrar'
                    }).then((result) => {

                        if (!result.value) {
                            $("#newProduct").modal('hide');
                        }
                    });
                }, error: function (err) {
                    console.log(err);
                }
            });

        });



        $('#saveCategory').submit(function (e) {
            e.preventDefault();

            if (!$('#category_id').val()) {
                method = 'POST';
            }
            else {
                method = 'PUT';
            }

            $.ajax({
                type: method,
                url: api + 'categories/category',
                data: $(this).serialize(),
                success: function (data, textStatus, jqXHR) {
                    $('#saveCategory').get(0).reset();
                    $('#saveCategory input[type=hidden').val('');
                    loadCategories();
                    loadProducts();
                    Swal.fire({
                        title: 'Categoría guardada',
                        text: "Seleccione una opción a continuación.",
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Agrega otro',
                        cancelButtonText: 'Cerrar'
                    }).then((result) => {
                        if (!result.value) {
                            $("#newCategory").modal('hide');
                        } else {
                            $('#saveCategory input:hidden').val('');
                        }
                    });
                }, error: function (err) {
                    console.log(err);
                }

            });


        });


        $.fn.editProduct = function (index) {
           
            $('#Products').modal('hide');

            $("#category option").filter(function () {
                return $(this).val() == allProducts[index].doc.category;
            }).prop("selected", true);

            $('#productName').val(allProducts[index].doc.name);
            $('#product_price').val(allProducts[index].doc.price);
            $('#quantity').val(allProducts[index].doc.quantity);

            $('#product_id').val(allProducts[index].doc._id);
            $('#img').val(allProducts[index].doc.img);

            if (allProducts[index].doc.image) {

                $('#imagename').hide();
                $('#current_img').html(`<img src="${allProducts[index].doc.image}" alt="">`);
                $('#rmv_img').show();
            }

            if (allProducts[index].doc.stock == 0) {
                $('#stock').prop("checked", true);
            }

            $('#newProduct').modal('show');
        }

        $.fn.editCustomer = function () {
            let customer = $('#customer').val();

            if (!customer) {
                return
            }
            
            customer = JSON.parse(customer)

            let id = customer.id;
            loadCustomer(id);
            $('#newCustomer').modal('show');
        }

        $("#userModal").on("hide.bs.modal", function () {
            $('.perms').hide();
        });


        $.fn.editUser = function (index) {

            user_index = index;

            $('#Users').modal('hide');

            $('.perms').show();

            $("#user_id").val(allUsers[index].doc._id);
            $('#fullname').val(allUsers[index].doc.fullname);
            $('#username').val(allUsers[index].doc.username);
            $('#password').val(atob(allUsers[index].doc.password));

            if (allUsers[index].doc.perm_products == 1) {
                $('#perm_products').prop("checked", true);
            }
            else {
                $('#perm_products').prop("checked", false);
            }

            if (allUsers[index].doc.perm_categories == 1) {
                $('#perm_categories').prop("checked", true);
            }
            else {
                $('#perm_categories').prop("checked", false);
            }

            if (allUsers[index].doc.perm_transactions == 1) {
                $('#perm_transactions').prop("checked", true);
            }
            else {
                $('#perm_transactions').prop("checked", false);
            }

            if (allUsers[index].doc.perm_users == 1) {
                $('#perm_users').prop("checked", true);
            }
            else {
                $('#perm_users').prop("checked", false);
            }

            if (allUsers[index].doc.perm_settings == 1) {
                $('#perm_settings').prop("checked", true);
            }
            else {
                $('#perm_settings').prop("checked", false);
            }

            $('#userModal').modal('show');
        }


        $.fn.editCategory = function (index) {
            $('#Categories').modal('hide');
            $('#categoryName').val(allCategories[index].doc.name);
            $('#category_id').val(allCategories[index].doc._id);
            $('#newCategory').modal('show');
        }


        $.fn.deleteProduct = function (id) {
            Swal.fire({
                title: '¿Está seguro?',
                text: "Está a punto de eliminar este producto.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: '¡Sí, bórralo!'
            }).then((result) => {

                if (result.value) {

                    $.ajax({
                        url: api + 'inventory/product/' + id,
                        type: 'DELETE',
                        success: function (result) {
                            loadProducts();
                            Swal.fire(
                                '¡Hecho!',
                                'Producto eliminado',
                                'success'
                            );

                        }
                    });
                }
            });
        }


        $.fn.deleteUser = function (id) {
            Swal.fire({
                title: '¿Está seguro?',
                text: "Estás a punto de eliminar a este usuario.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: '¡Sí, eliminar!'
            }).then((result) => {

                if (result.value) {

                    $.ajax({
                        url: api + 'users/user/' + id,
                        type: 'DELETE',
                        success: function (result) {
                            loadUserList();
                            Swal.fire(
                                '¡Hecho!',
                                'Usuario eliminado',
                                'success'
                            );

                        }
                    });
                }
            });
        }


        $.fn.deleteCategory = function (id) {
            Swal.fire({
                title: '¿Está seguro?',
                text: "Está a punto de eliminar esta categoría.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: '¡Sí, bórralo!'
            }).then((result) => {

                if (result.value) {

                    $.ajax({
                        url: api + 'categories/category/' + id,
                        type: 'DELETE',
                        success: function (result) {
                            loadCategories();
                            Swal.fire(
                                '¡Hecho!',
                                'Categoría eliminada',
                                'success'
                            );

                        }
                    });
                }
            });
        }


        $('#productModal').click(function () {
            loadProductList();
        });


        $('#usersModal').click(function () {
            loadUserList();
        });


        $('#categoryModal').click(function () {
            loadCategoryList();
        });


        function loadUserList() {

            let counter = 0;
            let user_list = '';
            $('#user_list').empty();
            $('#userList').DataTable().destroy();

            $.get(api + 'users/all', function (users) {



                allUsers = [...users];
                users.forEach((user, index) => {
                    user = user.doc;
                    
                    state = [];
                    let class_name = '';

                    if (user.status != "") {
                        state = user.status.split("_");

                        switch (state[0]) {
                            case 'Logged In': class_name = 'btn-default';
                                break;
                            case 'Logged Out': class_name = 'btn-light';
                                break;
                        }
                    }

                    counter++;
                    user_list += `<tr>
            <td>${user.fullname}</td>
            <td>${user.username}</td>
            <td class="${class_name}">${state.length > 0 ? state[0] : ''} <br><span style="font-size: 11px;"> ${state.length > 0 ? moment(state[1]).format('hh:mm A DD MMM YYYY') : ''}</span></td>
            <td>${user._id == 1 ? '<span class="btn-group"><button class="btn btn-dark"><i class="fa fa-edit"></i></button><button class="btn btn-dark"><i class="fa fa-trash"></i></button></span>' : '<span class="btn-group"><button onClick="$(this).editUser(' + index + ')" class="btn btn-warning"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteUser(' + user._id + ')" class="btn btn-danger"><i class="fa fa-trash"></i></button></span>'}</td></tr>`;

                    if (counter == users.length) {

                        $('#user_list').html(user_list);

                        $('#userList').DataTable({
                            "order": [[1, "desc"]]
                            , "autoWidth": false
                            , "info": true
                            , "JQueryUI": true
                            , "ordering": true
                            , "paging": false
                        });
                    }

                });

            });
        }


        function loadProductList() {
            let products = [...allProducts];
            let product_list = '';
            let counter = 0;
            $('#product_list').empty();
            $('#productList').DataTable().destroy();

            products.forEach((product, index) => {
                product = product.doc;
                counter++;

                let category = allCategories.filter( category => category.id == product.category);

                product_list += `<tr>
            <td><img id="`+ product._id + `"></td>
            <td style="text-align: center;"><img style="max-height: 50px; max-width: 50px; border: 1px solid #ddd;" src="${product.image}" id="product_img"></td>
            <td>${product.name}</td>
            <td>${settings.symbol} ${product.price}</td>
            <td>${product.stock == 1 ? product.quantity : 'N/A'}</td>
            <td>${category.length > 0 ? category[0].doc.name : ''}</td>
            <td class="nobr"><span class="btn-group"><button onClick="$(this).editProduct(${index})" class="btn btn-warning btn-sm"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteProduct(${product._id})" class="btn btn-danger btn-sm"><i class="fa fa-trash"></i></button></span></td></tr>`;

                if (counter == allProducts.length) {

                    $('#product_list').html(product_list);
                    products.forEach(pro => {
                        pro = pro.doc;
                        $("#" + pro._id + "").JsBarcode(pro._id, {
                            width: 2,
                            height: 25,
                            fontSize: 14
                        });
                    });

                    $('#productList').DataTable({
                        "order": [[1, "desc"]]
                        , "autoWidth": false
                        , "info": true
                        , "JQueryUI": true
                        , "ordering": true
                        , "paging": false
                    });
                }

            });
        }


        function loadCategoryList() {

            let category_list = '';
            let counter = 0;
            $('#category_list').empty();
            $('#categoryList').DataTable().destroy();
          
            allCategories.forEach((category, index) => {

                counter++;

                category_list += `<tr>
     
            <td>${category.doc.name}</td>
            <td><span class="btn-group"><button onClick="$(this).editCategory(${index})" class="btn btn-warning"><i class="fa fa-edit"></i></button><button onClick="$(this).deleteCategory(\'${category.doc._id}\')" class="btn btn-danger"><i class="fa fa-trash"></i></button></span></td></tr>`;
            });

            if (counter == allCategories.length) {

                $('#category_list').html(category_list);
                $('#categoryList').DataTable({
                    "autoWidth": false
                    , "info": true
                    , "JQueryUI": true
                    , "ordering": true
                    , "paging": false

                });
            }
        }


        $.fn.serializeObject = function () {
            var o = {};
            var a = this.serializeArray();
            $.each(a, function () {
                if (o[this.name]) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]];
                    }
                    o[this.name].push(this.value || '');
                } else {
                    o[this.name] = this.value || '';
                }
            });
            return o;
        };



        $('#log-out').click(function () {

            Swal.fire({
                title: '¿Está seguro?',
                text: "Estas a punto de desconectarte.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Cerrar Sesión',
                cancelButtonText: 'Cancelar'
            }).then((result) => {

                if (result.value) {
                    $.get(api + 'users/logout/' + user._id, function (data) {
                        storage.delete('auth');
                        storage.delete('user');
                        ipcRenderer.send('app-reload', '');
                    });
                }
            });
        });



        $('#settings_form').on('submit', function (e) {
            e.preventDefault();
            let formData = $(this).serializeObject();
            let mac_address;

            api = 'http://' + host + ':' + port + '/api/';

            macaddress.one(function (err, mac) {
                mac_address = mac;
            });

            formData['app'] = $('#app').val();
            formData['mac'] = mac_address;
            formData['till'] = 1;
            
            if (!formData.charge_tax && formData.price_with_tax) {
                Swal.fire(
                    '¡Uy!',
                    'Si selecciona la opción de "Impuestos incluidos en el precio" debe asegurarse de que la opción "Cobrar Impuestos" esté seleccionado.' ,
                    'warning'
                );
                return;
            }

            $('#settings_form').append('<input type="hidden" name="app" value="' + formData.app + '" />');

            if (formData.percentage != "" && !$.isNumeric(formData.percentage)) {
                Swal.fire(
                    '¡Uy!',
                    'Por favor, asegúrese de que el valor del impuesto sea un número.',
                    'warning'
                );
            }
            else {
                storage.set('settings', formData);

                $(this).attr('action', api + 'settings');
                $(this).attr('method', 'POST');


                $(this).ajaxSubmit({
                    contentType: 'application/json',
                    success: function (response) {

                        ipcRenderer.send('app-reload', '');

                    }, error: function (err) {
                        console.log(err);
                    }

                });

            }

        });



        $('#net_settings_form').on('submit', function (e) {
            e.preventDefault();
            let formData = $(this).serializeObject();

            if (formData.till == 0 || formData.till == 1) {
                Swal.fire(
                    '¡Uy!',
                    'Por favor ingrese un número mayor a 1.',
                    'warning'
                );
            }
            else {
                if (isNumeric(formData.till)) {
                    formData['app'] = $('#app').val();
                    storage.set('settings', formData);
                    ipcRenderer.send('app-reload', '');
                }
                else {
                    Swal.fire(
                        '¡Uy!',
                        '¡Número de Caja Registradora debe ser un número!',
                        'warning'
                    );
                }

            }

        });



        $('#saveUser').on('submit', function (e) {
            e.preventDefault();
            let formData = $(this).serializeObject();

            if (ownUserEdit) {
                if (formData.password !== atob(user.password)) {
                    if (formData.password != formData.pass) {
                        Swal.fire(
                            '¡Uy!',
                            '¡Las contraseñas no coinciden!',
                            'warning'
                        );
                    }
                }
            }
            else {
                if (formData.password != atob(allUsers[user_index].doc.password)) {
                    if (formData.password != formData.pass) {
                        Swal.fire(
                            '¡Uy!',
                            '¡Las contraseñas no coinciden!',
                            'warning'
                        );
                    }
                }
            }



            if (formData.password == atob(user.password) || formData.password == atob(allUsers[user_index].doc.password) || formData.password == formData.pass) {
                $.ajax({
                    url: api + 'users/post',
                    type: 'POST',
                    data: JSON.stringify(formData),
                    contentType: 'application/json; charset=utf-8',
                    cache: false,
                    processData: false,
                    success: function (data) {

                        if (ownUserEdit) {
                            ipcRenderer.send('app-reload', '');
                        }

                        else {
                            $('#userModal').modal('hide');

                            loadUserList();

                            $('#Users').modal('show');
                            Swal.fire(
                                '¡Está bien!',
                                '¡Se han guardado los datos del usuario!',
                                'success'
                            );
                        }


                    }, error: function (err) {
                        console.log(err);
                    }

                });

            }

        });



        $('#app').change(function () {
            if ($(this).val() == 'Network Point of Sale Terminal') {
                $('#net_settings_form').show(500);
                $('#settings_form').hide(500);
                macaddress.one(function (err, mac) {
                    $("#mac").val(mac);
                });
            }
            else {
                $('#net_settings_form').hide(500);
                $('#settings_form').show(500);
            }

        });



        $('#cashier').click(function () {

            ownUserEdit = true;

            $('#userModal').modal('show');

            $("#user_id").val(user._id);
            $("#fullname").val(user.fullname);
            $("#username").val(user.username);
            $("#password").val(atob(user.password));

        });



        $('#add-user').click(function () {

            if (platform.app != 'Network Point of Sale Terminal') {
                $('.perms').show();
            }

            $("#saveUser").get(0).reset();
            $('#saveUser input[type=hidden').val('');
            $('#userModal').modal('show');

        });



        $('#settings').click(async function () {

            if (platform.app == 'Network Point of Sale Terminal') {
                $('#net_settings_form').show(500);
                $('#settings_form').hide(500);

                $("#ip").val(platform.ip);
                $("#till").val(platform.till);

                macaddress.one(function (err, mac) {
                    $("#mac").val(mac);
                });

                $("#app option").filter(function () {
                    return $(this).text() == platform.app;
                }).prop("selected", true);
            }
            else {
                $('#net_settings_form').hide(500);
                await loadSettings();
                $('#settings_form').show(500);
            }

        });


    });


    $('#rmv_logo').click(function () {
        $('#remove_logo').val("1");
        $('#current_logo').hide(500);
        $(this).hide(500);
        $('#logoname').show(500);
    });


    $('#rmv_img').click(function () {
        $('#remove_img').val("1");
        $('#current_img').hide(500);
        $(this).hide(500);
        $('#imagename').show(500);
    });


    $('#print_list').click(function () {

        $("#loading").show();

        $('#productList').DataTable().destroy();

        const filename = 'productList.pdf';

        html2canvas($('#all_products').get(0)).then(canvas => {
            let height = canvas.height * (25.4 / 96);
            let width = canvas.width * (25.4 / 96);
            let pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);

            $("#loading").hide();
            pdf.save(filename);
        });



        $('#productList').DataTable({
            "order": [[1, "desc"]]
            , "autoWidth": false
            , "info": true
            , "JQueryUI": true
            , "ordering": true
            , "paging": false
        });

        $(".loading").hide();

    });

    $('#document_number').on('keypress', async function (e) {
        if(e.which === 13) {
            e.preventDefault();
            
            $(this).attr("disabled", "disabled");
            
            if ($('#document_code').val() && $('#document_number').val()) {

                if ($('#document_code').val() === '1' && $('#document_number').val().length !== 8) {
                    Swal.fire(
                        '¡Error!',
                        'DNI Incorrecto',
                        'error'
                    );
                    $(this).removeAttr("disabled");
                    return;
                }

                if ($('#document_code').val() === '6' && $('#document_number').val().length !== 11) {
                    Swal.fire(
                        '¡Error!',
                        'RUC Incorrecto',
                        'error'
                    );
                    $(this).removeAttr("disabled");
                    return;
                }

                await loadDniRuc($('#document_code').val(), $('#document_number').val()).catch(function (err) {
                    Swal.fire(
                        '¡Error!',
                        'Error interno, verifique el token',
                        'error'
                    );
                    
                    console.log(err)
                })
            }

            $(this).removeAttr("disabled");
        }
  });
}


$.fn.print = function () {

    printJS({ printable: receipt, type: 'raw-html' });

}

function loadDniRuc(type, number) {
    return $.get(api + 'customers/search/' + type + '/' + number, function (data) {
        
        if (type === '1') {
            $('#userName').val(data.nombres + ' ' + data.apellidoPaterno + ' ' + data.apellidoMaterno);
        }

        if (type === '6') {
            $('#userName').val(data.razonSocial);
            $('#customer_street').val(data.direccion);
            $('#customer_district').val(data.distrito);
            $('#customer_state').val(data.capital);
            $('#customer_city').val(data.departamento);
            $('#customer_zip').val(data.ubigeo);
        }
        
    });
}

function loadSettings() {
    return $.get(api + 'settings/all', function (data) {
        settings = data.settings;
        
        if (data._attachments && data._attachments.logo) {
           settings.logo = 'data:' + data._attachments.logo.content_type + ';base64,' + data._attachments.logo.data;
        }

        $("#settings_id").val("1");
        $("#store").val(settings.store);
        $("#legal_name").val(settings.legal_name);
        $("#tradename").val(settings.tradename);
        $("#street").val(settings.address && settings.address.street);
        $("#state").val(settings.address && settings.address.state);
        $("#city").val(settings.address && settings.address.city);
        $("#district").val(settings.address && settings.address.district);
        $("#zip").val(settings.address && settings.address.zip);
        $("#contact").val(settings.contact);
        $("#vat_no").val(settings.vat_no);
        $("#symbol").val(settings.symbol);
        $("#percentage").val(settings.percentage);
        $("#footer").val(settings.footer);
        $("#logo_img").val(settings.img);
        if (settings.charge_tax) {
            $('#charge_tax').prop("checked", true);
        }
        if (settings.price_with_tax) {
            $('#price_with_tax').prop("checked", true);
        }
        
        if (settings.logo) {
            $('#logoname').hide();
            $('#current_logo').html(`<img src="${settings.logo}" alt="">`);
            $('#rmv_logo').show();
        }

        $("#app option").filter(function () {
            return $(this).text() == settings.app;
        }).prop("selected", true);

        let ticket = settings.document_types.find(s => s.code === "12");
        let boleta = settings.document_types.find(s => s.code === "03");
        let factura = settings.document_types.find(s => s.code === "01");
        

        $("#serie_t").val(ticket.serie);
        $("#next_correlative_t").val(ticket.next_correlative);

        $("#serie_b").val(boleta.serie);
        $("#next_correlative_b").val(boleta.next_correlative);

        $("#serie_f").val(factura.serie);
        $("#next_correlative_f").val(factura.next_correlative);

        $("#token").val(settings.token);
        $("#token_consulta").val(settings.token_consulta);
    });
}

function loadCustomer(id) {
    return $.get(api + 'customers/customer/' + id, function (data) {
        let customer = data;
        
        $('#customer_id').val(customer._id);
        $('#userName').val(customer.name);
        $('#document_code').val(customer.document_type.code);
        $('#document_number').val(customer.document_type.number);
        $('#phoneNumber').val(customer.phone);
        $('#emailAddress').val(customer.email);
        $('#customer_street').val(customer.address.street);
        $('#customer_state').val(customer.address.state);
        $('#customer_city').val(customer.address.city);
        $('#customer_district').val(customer.address.district);
        $('#customer_zip').val(customer.address.zip);
    });
}


function loadTransactions() {

    let tills = [];
    let users = [];
    let sales = 0;
    let transact = 0;
    let unique = 0;

    sold_items = [];
    sold = [];

    let counter = 0;
    let transaction_list = '';
    let query = `transactions/by-date?start=${start_date}&end=${end_date}&user=${by_user}&status=${by_status}&till=${by_till}`;


    $.get(api + query, function (transactions) {
        transactions = transactions.docs;

        if (transactions.length > 0) {

            $('#transaction_list').empty();
            $('#transactionList').DataTable().destroy();

            allTransactions = [...transactions];

            transactions.forEach((trans, index) => {
                sales += parseFloat(trans.total);
                transact++;

                trans.items.forEach(item => {
                    sold_items.push(item);
                });

                

                if (!tills.includes(trans.till)) {
                    tills.push(trans.till);
                }

                if (!users.includes(trans.user_id)) {
                    users.push(trans.user_id);
                }

                let trClass = '', suntaState = '';
                if (trans.sunat_state === 'success') {
                    trClass = 'success';
                    suntaState = 'Aceptado';
                }
                if (trans.sunat_state === 'nullable') {
                    trClass = 'warning'
                    suntaState = 'Por Anular';
                }
                if (trans.sunat_state === 'null') {
                    trClass = 'danger'
                    suntaState = 'Anulado';
                }
                if (trans.sunat_state === 'observed') {
                    trClass = 'warning';
                    suntaState = 'Observado';
                }
                if (trans.sunat_state === 'send') {
                    trClass = 'warning';
                    suntaState = 'Enviado';

                    if (trans.sunat_state_summary === 3) {
                        suntaState += '<br />Por Anular'
                    }
                }
                
                counter++;
                transaction_list += `<tr class="${trClass}">
                                <!--<td>${trans.order}</td>-->
                                <td class="text-center"><b>${trans.serie}-${trans.correlative}</b></td>
                                <td class="nobr">${moment(trans.date).format('YYYY MMM DD HH:mm:ss')}</td>
                                <td>${settings.symbol + trans.total}</td>
                                <!--<td>${trans.paid == "" ? "" : settings.symbol + trans.paid}</td>-->
                                <!--<td>${trans.change ? settings.symbol + Math.abs(trans.change).toFixed(2) : ''}</td>-->
                                <td>${trans.paid == "" ? "" : trans.payment_type.name}</td>
                                <!--<td>${trans.till}</td>-->
                                <td>${trans.user}</td>
                                <td><b>${suntaState}</b></td>

                                <td class="text-center">
                                    <div class="btn-group">
                                        <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">        
                                            <span class="glyphicon glyphicon-option-vertical" aria-hidden="true"></span>
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-right">
                                            ${!trans.paid ? '<li class="disabled"><a href="#">Reimprimir</a></li>' : '<li><a href="#" onClick="$(this).viewTransaction(' + index + ')">Reimprimir</a></li>'}
                                            <li role="separator" class="divider"></li>
                                            <li><a href="#" onClick="$(this).downloadXML('${index}')">Descargar XML</a></li>
                                            <li><a href="#" onClick="$(this).downloadPDF('${index}')">Descargar PDF</a></li>
                                            <li><a href="#" onClick="$(this).downloadCDR('${index}')">Descargar CDR</a></li>
                                            <li role="separator" class="divider"></li>
                                            <!--<li><a href="#">Cambiar Estado</a></li>-->
                                            ${trans.sunat_state !== 'success' && trans.sunat_state !== 'null' ? '<li><a href="#" onClick="$(this).resend(' + index + ')">Reenviar a Sunat</a></li> <li role="separator" class="divider"></li>' : ''}
                                            
                                            ${trans.document_type.code === '01' && trans.sunat_state !== 'null' ? '<li><a href="#" onClick="$(this).sendVoided(' + index + ')">Comunicar Baja</a></li>' : '' }   
                                            ${trans.document_type.code === '01' ? '<li><a href="#" onClick="$(this).statusVoided(' + index + ')">Consultar Estado de Baja</a></li>' : ''}
                                        
                                            ${trans.document_type.code === '03' && trans.sunat_state !== 'null' ? '<li><a href="#" onClick="$(this).sendSummaryNullable(' + index + ')">Anular Mediante Resumen</a></li><li role="separator" class="divider"></li>' : '' }
                                            ${trans.document_type.code === '03' ? '<li><a href="#" onClick="$(this).statusSummary(' + index + ')">Consultar Estado de Resumen</a></li>' : ''}

                                            <li role="separator" class="divider"></li>
                                            <li><a href="#"  onClick="$(this).viewLogs(${index})">Logs</a></li>

                                        </ul>
                                    </div>
                                </td>
                                </tr>
                    `;
                
                if (counter == transactions.length) {
                    $('#total_sales #counter').text(settings.symbol + parseFloat(sales).toFixed(2));
                    $('#total_transactions #counter').text(transact);

                    const result = {};

                    for (const { product_name, price, quantity, id } of sold_items) {
                        if (!result[product_name]) result[product_name] = [];
                        result[product_name].push({ id, price, quantity });
                    }

                    for (item in result) {

                        let price = 0;
                        let quantity = 0;
                        let id = 0;

                        result[item].forEach(i => {
                            id = i.id;
                            price = i.price;
                            quantity += i.quantity;
                        });

                        sold.push({
                            id: id,
                            product: item,
                            qty: parseFloat(quantity),
                            price: parseFloat(price)
                        });
                    }
                   
                    loadSoldProducts();
                    
                    if (by_user == 0 && by_till == 0) {
                        userFilter(users);
                        tillFilter(tills);
                    }
                
                    
                    $('#transaction_list').html(transaction_list);
                    $('#transactionList').DataTable({
                        "order": [[1, "desc"]]
                        , "autoWidth": false
                        , "info": true
                        , "JQueryUI": true
                        , "ordering": true
                        , "paging": true,
                        "dom": 'Bfrtip',
                        "buttons": ['csv', 'excel', 'pdf',]

                    });
                }
            });
        }
        else {
            Swal.fire(
                '¡Sin datos!',
                'No hay transacciones disponibles dentro de los criterios seleccionados',
                'warning'
            );
        }

    });
}


function discend(a, b) {
    if (a.qty > b.qty) {
        return -1;
    }
    if (a.qty < b.qty) {
        return 1;
    }
    return 0;
}


function loadSoldProducts() {

    sold.sort(discend);

    let counter = 0;
    let sold_list = '';
    let items = 0;
    let products = 0;
    $('#product_sales').empty();

    sold.forEach((item, index) => {
        items += item.qty;
        products++;

        let product = allProducts.filter(function (selected) {
            selected = selected.doc;
            return selected._id == item.id;
        });
    
        counter++;

        sold_list += `<tr>
            <td>${item.product}</td>
            <td>${item.qty}</td>
            <td>${product[0].stock == 1 ? product.length > 0 ? product[0].quantity : '' : 'N/A'}</td>
            <td>${settings.symbol + (item.qty * parseFloat(item.price)).toFixed(2)}</td>
            </tr>`;
        if (counter == sold.length) {
            $('#total_items #counter').text(items);
            $('#total_products #counter').text(products);
            $('#product_sales').html(sold_list);
        }
    });
}


function userFilter(users) {

    $('#users').empty();
    $('#users').append(`<option value="0">All</option>`);

    users.forEach(user => {
        let u = allUsers.filter(function (usr) {
            return usr.doc._id == user;
        });
        
        $('#users').append(`<option value="${user}">${u[0].doc.fullname}</option>`);
    });

}


function tillFilter(tills) {

    $('#tills').empty();
    $('#tills').append(`<option value="0">All</option>`);
    tills.forEach(till => {
        $('#tills').append(`<option value="${till}">${till}</option>`);
    });

}


$.fn.viewTransaction = function (index) {

    transaction_index = index;

    let discount = allTransactions[index].discount;
    let customer = !allTransactions[index].customer? 'Seleccione un cliente' : allTransactions[index].customer.username;
    let refNumber = allTransactions[index].ref_number != "" ? allTransactions[index].ref_number : allTransactions[index].order;
    let orderNumber = allTransactions[index].order;
    let type = allTransactions[index].payment_type.name;
    let tax_row = "";
    let items = "";
    let products = allTransactions[index].items;

    products.forEach(item => {
        items += "<tr><td>" + item.product_name + "</td><td>" + item.quantity + "</td><td>" + settings.symbol + parseFloat(item.price).toFixed(2) + "</td></tr>";

    });


    if (allTransactions[index].paid != "") {
        payment = `<tr>
                    <td>Pagado</td>
                    <td>:</td>
                    <td>${settings.symbol + allTransactions[index].paid}</td>
                </tr>
                <tr>
                    <td>Vuelto</td>
                    <td>:</td>
                    <td>${settings.symbol + Math.abs(allTransactions[index].change).toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Método</td>
                    <td>:</td>
                    <td>${type}</td>
                </tr>`
    }



    if (settings.charge_tax) {
        tax_row = `<tr>
                <td>IGV(${settings.percentage})% </td>
                <td>:</td>
                <td>${settings.symbol}${parseFloat(allTransactions[index].tax).toFixed(2)}</td>
            </tr>`;
    }



    receipt = `<div style="font-size: 10px;">                            
        <p style="text-align: center;">
        ${settings.img == "" ? settings.img : '<img style="max-width: 50px;max-width: 100px;" src ="' + settings.logo + '" /><br>'}
            <span style="font-size: 17px;">${settings.legal_name}</span> <br>
            ${settings.address.street} ${settings.address.district} ${settings.address.city} ${settings.address.state} <br>
            ${settings.contact != '' ? 'Teléfono: ' + settings.contact + '<br>' : ''} 
            ${settings.vat_no != '' ? 'RUC ' + settings.vat_no + '<br>' : ''}
            ${allTransactions[index].document_type.name ? '<span style="font-size: 15px; text-transform: uppercase;">' + allTransactions[index].document_type.name + '</span> <br />' : ''}
            <span style="font-size: 15px; text-transform: uppercase;"><b>${allTransactions[index].serie || ''} - ${allTransactions[index].correlative || ''}</b></span> <br />
    </p>
    <hr>
    <left>
        <p>
        Pedido N° : ${orderNumber} <br>
        <!--Ref No : ${refNumber} <br>-->
        Cliente : ${allTransactions[index].customer.name || ''} <br>
        Cajero : ${allTransactions[index].user} <br>
        Fecha : ${moment(allTransactions[index].date).format('DD MMM YYYY HH:mm:ss')}<br>
        </p>

    </left>
    <hr>
    <table width="100%">
        <thead style="text-align: left;">
        <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio</th>
        </tr>
        </thead>
        <tbody>
        ${items}                
 
        <tr>                        
            <td><b>Subtotal</b></td>
            <td>:</td>
            <td><b>${settings.symbol}${parseFloat(allTransactions[index].subtotal).toFixed(2)}</b></td>
        </tr>
        <!--<tr>
            <td>Descuento</td>
            <td>:</td>
            <td>${discount > 0 ? settings.symbol + parseFloat(allTransactions[index].discount).toFixed(2) : ''}</td>
        </tr>-->
        
        ${tax_row}
    
        <tr>
            <td><h3>Total</h3></td>
            <td><h3>:</h3></td>
            <td>
                <h3>${settings.symbol}${allTransactions[index].total}</h3>
            </td>
        </tr>
        ${payment == 0 ? '' : payment}
        </tbody>
        </table>
        <br>
        <hr>
        <br>
        <p style="text-align: center;">
         ${settings.footer}
         </p>
        </div>`;

    if (allTransactions[index].document_type.code === '01' || allTransactions[index].document_type.code === '03') {
        // obtener qr
        try {
            $.get(api + 'transactions/' + allTransactions[index]._id + '/qr', function(data){
                // $('#viewTransaction table').after('<br /><div style="text-align: center;">' + data + '</div>')
                $('#viewTransaction table').after('<br /><div style="text-align: center;"><img src="' + data + '" /></div>')
                receipt += '<br /><div style="text-align: center;">' + data + '</div>';
            });
        } catch (error) {
            console.log(error)
        }
    }


    $('#viewTransaction').html('');
    $('#viewTransaction').html(receipt);

    $('#orderModal').modal('show');

}


$.fn.viewLogs = function (index) {
    let id = allTransactions[index]._id;
    

    $.ajax({
        type: 'GET',
        url: api + "logs/by-transaction?id=" + id
    }).done(function(data){

        $('#viewLogs table tbody').html('');
        $("#logsModal h4").html('Historial <b>' + allTransactions[index].serie + '-' + allTransactions[index].correlative + '</b>')
        for (let i = 0; i < data.docs.length; i++) {
            const element = data.docs[i];
            let tr = $('<tr>');
            // tr.addClass(element.type === 'error' ? 'danger' : element.type)
            tr.append('<td>' + moment(element.date).format('YYYY MM DD HH:mm:ss') + '</td>')
            tr.append('<td>' + element.name + '</td>')
            tr.append('<td>' + element.description + '</td>')
            $('#viewLogs table tbody').append(tr)
            $('#logsModal').modal('show');
        }
    })

}

function downloadx(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.click();
}

function downloadp(filename, data) {
    var link = document.createElement('a');
    link.download = filename;
    link.href = window.URL.createObjectURL(data);
    link.click();
}


$.fn.downloadXML = function(index) {
    let id = allTransactions[index]._id;
    let serie = allTransactions[index].serie;
    let correlative = allTransactions[index].correlative;

    $.ajax({
        type: 'GET',
        url: api + "transactions/" + id + "/xml"
    }).done(function(data){
        downloadx(serie + '-' + correlative + '.xml', data)
    })
}

$.fn.downloadPDF = function(index) {
    let id = allTransactions[index]._id;
    let serie = allTransactions[index].serie;
    let correlative = allTransactions[index].correlative;

    $.ajax({
        xhrFields: {
           responseType: 'blob' 
        },
        type:'GET',
        url:api + "transactions/" + id + "/pdf"
    }).done(function(data){
        downloadp(serie + '-' + correlative + '.pdf', data)
    });
}

$.fn.downloadCDR = function(index) {
    let data = '';
    let serie = allTransactions[index].serie;
    let correlative = allTransactions[index].correlative;

    if (allTransactions[index].document_type.code === '03') {
        data = allTransactions[index].sunat_response_summary_status.cdrZip
    } else if (allTransactions[index].document_type.code === '01') {
        data = allTransactions[index].sunat_response.cdrZip;
    }
    
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;base64,' + data);
    element.setAttribute('download', serie + '-' + correlative + '.zip');
    element.click();
}

$.fn.sendVoided = async function(index) {
    let confirmation = await Swal.fire({
        title: "¿Comunicar Baja?",
        text: "Esto comunicará el documento a SUNAT para su baja.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '¡Sí, Comunícalo!'
    })

    if (!confirmation.isConfirmed) {
        return;
    }

    let id = allTransactions[index]._id;
    
    if (allTransactions[index].sunat_state === 'null') {
        return Swal.fire(
            '¡Ups!',
            'El comprobante ya está eliminado',
            'error'
        )
    }

    $.ajax({
        type: 'POST',
        url: api + "transactions/voided/" + id
    }).done(function(data){
        if (data.sunatResponse.success) {
            Swal.fire(
                '¡Solicitud de comunicación de Baja!',
                'Ticket generado: ' + data.sunatResponse.ticket,
                'success'
            )
            
            loadTransactions();
        } else {
            Swal.fire(
                'Error comunicación de Baja!',
                data.sunatResponse.error.code + ' ' + data.sunatResponse.error.message,
                'error'
            )
        }
    }).fail(function (e) {
        Swal.fire(
            '¡Error!',
            'Error al emitir la comunicación de baja: ' + e.responseText,
            'error'
        );
    })
}

$.fn.statusVoided = async function(index) {
    let confirmation = await Swal.fire({
        title: "¿Consultar Estado de Baja?",
        text: "Esto consultará el estado de la comunicación de baja.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '¡Sí, Consúltalo!'
    })

    if (!confirmation.isConfirmed) {
        return;
    }
    
    let id = allTransactions[index]._id;
    
    $.ajax({
        type: 'POST',
        url: api + "transactions/voided/" + id + "/status"
    }).done(function(data){
        
        if (data.success) {
            Swal.fire(
                '¡Comunicación de Baja!',
                data.cdrResponse.description,
                'success'
            )
        } else {
            Swal.fire(
                '¡Error consulta comunicación de Baja!',
                data.error.code + ' ' + data.error.message,
                'error'
            )
        }

        loadTransactions();
    }).fail(function (e) {
        Swal.fire(
            '¡Error!',
            'Error al consultar la comunicación de baja: ' + e.responseText,
            'error'
        );

        loadTransactions();
    })
}

$.fn.resend = async function(index) {
    let confirmation = await Swal.fire({
        title: "¿Desea volver a enviar el comprobante?",
        text: "Esto enviará un resumen diario en caso de boletas y para facturas el envío será directo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '¡Sí, Volver a Emitir!'
    })

    if (!confirmation.isConfirmed) {
        return;
    }

    if (allTransactions[index].sunat_state === 'null' || allTransactions[index].sunat_state === 'success') {
        return Swal.fire(
            '¡Ups!',
            'El comprobante ya está aceptado o anulado',
            'error'
        )
    }

    let id = allTransactions[index]._id;

    if(allTransactions[index].document_type.code === '03') {
        $.ajax({
            type: 'POST',
            url: api + "transactions/summary/" + id
        }).done(function(data) {
            if (data.sunatResponse.success) {
                Swal.fire(
                    '¡Resumen Diario!',
                    'Ticket generado: ' + data.sunatResponse.ticket,
                    'success'
                )
                
                loadTransactions();
            } else {
                Swal.fire(
                    '¡Error resumen!',
                    data.sunatResponse.error.code + ' ' + data.sunatResponse.error.message,
                    'error'
                )
            }
        }).fail(function (e) {
            Swal.fire(
                '¡Error!',
                'Error al emitir el resumen: ' + e.responseText,
                'error'
            );
        })
    } else if(allTransactions[index].document_type.code === '01') {
        $.ajax({
            type: 'POST',
            url: api + "transactions/invoice/" + id
        }).done(function(data) {
            if (data.sunatResponse.success) {
                Swal.fire(
                    '¡Comprobante Electrónico!',
                    data.sunatResponse.cdrResponse.code + '|' + data.sunatResponse.cdrResponse.description + '<br /><br />' + data.sunatResponse.cdrResponse.notes.toString(),
                    'success'
                )
                
                loadTransactions();
            } else {
                Swal.fire(
                    '¡Error resumen!',
                    data.sunatResponse.error.code + ' ' + data.sunatResponse.error.message,
                    'error'
                )
            }
        }).fail(function (e) {
            Swal.fire(
                '¡Error!',
                'Error al emitir el resumen: ' + e.responseText,
                'error'
            );
        })
    }

}

$.fn.sendSummaryNullable = async function(index) {
    let confirmation = await Swal.fire({
        title: "¿Desea Anular el comprobante?",
        text: "Esto enviará un resumen diario para anular el comprobante.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '¡Sí, Anúlalo!'
    })

    if (!confirmation.isConfirmed) {
        return;
    }

    let id = allTransactions[index]._id;
    
    if (allTransactions[index].sunat_state === 'null') {
        return Swal.fire(
            '¡Ups!',
            'El comprobante ya está eliminado',
            'error'
        )
    }

    $.ajax({
        type: 'POST',
        url: api + "transactions/set-nullable/" + id
    }).done(function(data){

        $.ajax({
            type: 'POST',
            url: api + "transactions/summary/" + id
        }).done(function(data) {
            if (data.sunatResponse.success) {
                Swal.fire(
                    '¡Resumen Diario!',
                    'Ticket generado: ' + data.sunatResponse.ticket,
                    'success'
                )
                
                loadTransactions();
            } else {
                Swal.fire(
                    '¡Error resumen!',
                    data.sunatResponse.error.code + ' ' + data.sunatResponse.error.message,
                    'error'
                )
            }
        }).fail(function (e) {
            Swal.fire(
                '¡Error!',
                'Error al emitir el resumen: ' + e.responseText,
                'error'
            );
        })
    }).fail(function (e) {
        Swal.fire(
            '¡Error!',
            'Error al emitir la comunicación de baja: ' + e.responseText,
            'error'
        );
    })
}

$.fn.statusSummary = async function(index) {
    let confirmation = await Swal.fire({
        title: "¿Consultar Estado de Resumen?",
        text: "Esto consultará el estado del resumen diario.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '¡Sí, Consúltalo!'
    })

    if (!confirmation.isConfirmed) {
        return;
    }
    
    let id = allTransactions[index]._id;
    
    $.ajax({
        type: 'POST',
        url: api + "transactions/summary/" + id + "/status"
    }).done(function(data){
        
        if (data.success) {
            Swal.fire(
                '¡Resumen Diario!',
                data.cdrResponse.code + '|' + data.cdrResponse.description + '<br /><br />' + data.cdrResponse.notes.toString(),
                'success'
            )
        } else {
            Swal.fire(
                '¡Error consulta resumen diario!',
                data.error.code + ' ' + data.error.message,
                'error'
            )
        }

        loadTransactions();
    }).fail(function (e) {
        Swal.fire(
            '¡Error!',
            'Error al consultar el resumen diario: ' + e.responseText,
            'error'
        );

        loadTransactions();
    })
}

$.fn.exportBackup = async function() {

    let confirmation = await Swal.fire({
        title: "¿Desea generar una copia de seguridad?",
        text: "Esto descargará un archivo zip que contiene toda su base de datos",
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: '¡Sí, Descargar!'
    })

    if (!confirmation.isConfirmed) {
        return;
    }

    location.href = api + "settings/export";
    // $.ajax({
    //     xhrFields: {
    //        responseType: 'blob' 
    //     },
    //     type:'GET',
    //     url:api + "settings/export"
    // }).done(function(data){
    //     console.log(data)
    // });
}

$.fn.importBackup = async function() {
    Swal.fire({
        title: '¿Desea realizar una importacíón?',
        html: 'Esto reemplazará la base de datos actual. Se recomienda hacer una copia de seguridad antes. <br/><br/>Seleccione un archivo zip.',
        icon: 'question',
        input: 'file',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Importar',
        cancelButtonText: 'Cancelar',
        showLoaderOnConfirm: true,
        preConfirm: (zip) => {
            
            if (!zip) {
                return false;
            }
            
            let formData = new FormData();
            formData.append("file", zip);

            return fetch(api + 'settings/import', {method: "POST", body: formData})
                .then(response => {
                    if (!response.ok) {
                        throw new Error(response.statusText)
                    }
                    return response;
                })
                .catch(error => {
                    Swal.showValidationMessage(
                        `La importación ha falladdo: ${error}`
                    )
                })
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then(async (result) => {
        if (result.isConfirmed) {
            await Swal.fire({
                title: `Base de datos importada`
            })
            storage.delete('auth');
            storage.delete('user');
            ipcRenderer.send('app-relaunch', '');
        }
    })
}


$('#status').change(function () {
    by_status = $(this).find('option:selected').val();
    loadTransactions();
});



$('#tills').change(function () {
    by_till = $(this).find('option:selected').val();
    loadTransactions();
});


$('#users').change(function () {
    by_user = $(this).find('option:selected').val();
    loadTransactions();
});


$('#reportrange').on('apply.daterangepicker', function (ev, picker) {

    start = picker.startDate.format('DD MMM YYYY hh:mm A');
    end = picker.endDate.format('DD MMM YYYY hh:mm A');

    start_date = picker.startDate.toDate().toJSON();
    end_date = picker.endDate.toDate().toJSON();


    loadTransactions();
});


function authenticate() {
    $('#loading').append(
        `<div id="load"><form id="account"><div class="form-group"><input type="text" placeholder="Ingrese el nombre de usuario" name="username" class="form-control"></div>
        <div class="form-group"><input type="password" placeholder="Ingrese la contraseña" name="password" class="form-control"></div>
        <div class="form-group"><input type="submit" class="btn btn-block btn-default" value="Iniciar Sesión"></div></form>`
    );
}


$('body').on("submit", "#account", function (e) {
    e.preventDefault();
    let formData = $(this).serializeObject();

    if (formData.username == "" || formData.password == "") {

        Swal.fire(
            '¡Formulario incompleto!',
            auth_empty,
            'warning'
        );
    }
    else {

        $.ajax({
            url: api + 'users/login',
            type: 'POST',
            data: JSON.stringify(formData),
            contentType: 'application/json; charset=utf-8',
            cache: false,
            processData: false,
            success: function (data) {
                if (data._id) {
                    storage.set('auth', { auth: true });
                    storage.set('user', data);
                    ipcRenderer.send('app-reload', '');
                }
                else {
                    Swal.fire(
                        '¡Uy!',
                        auth_error,
                        'warning'
                    );
                }

            }, error: function (err) {
                console.log(err);
            }
        });
    }
});


$('#quit').click(function () {
    Swal.fire({
        title: '¿Está seguro?',
        text: "Está a punto de cerrar la aplicación.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Cerrar la aplicación'
    }).then((result) => {

        if (result.value) {
            ipcRenderer.send('app-quit', '');
        }
    });
});


