$(document).ready(function(){

    $('#categories').on('click', '.btn-categories', function(){

        if (this.id == 'all') {
            $('#parent > div').fadeIn(450);
        } else {
            var $el = $('.' + this.id).fadeIn(450);
            $('#parent > div').not($el).hide();
        }
 
        $("#categories .btn-categories").removeClass("active");
        $(this).addClass('active');

    });

 
    function searchProducts () {        
        $("#categories .btn-categories").removeClass("active");
       
        $('.box').show().not(function(){
            return $(this).find('.name, .sku').text().includes($("#search").val());
        }).hide();
    }

    let $search = $("#search").on('input',function(){
        searchProducts();       
    });


    $('body').on('click', '#jq-keyboard button', function(e) {
        if($("#search").is(":focus")) {
            searchProducts(); 
        }          
    });


    function searchOpenOrders() {
        var matcher = new RegExp($("#holdOrderInput").val(), 'gi');
        $('.order').show().not(function(){
            return matcher.test($(this).find('.ref_number').text())
        }).hide();

    }

    var $searchHoldOrder = $("#holdOrderInput").on('input',function () {
        searchOpenOrders();
    });


    $('body').on('click', '.holdOrderKeyboard .key', function() {
        if($("#holdOrderInput").is(":focus")) {
            searchOpenOrders(); 
        }          
    });
 
  
    function searchCustomerOrders() {
        var matcher = new RegExp($("#holdCustomerOrderInput").val(), 'gi');
        $('.customer-order').show().not(function(){
            return matcher.test($(this).find('.customer_name').text())
        }).hide();
    }

    var $searchCustomerOrder = $("#holdCustomerOrderInput").on('input',function () {
        searchCustomerOrders();
    });


    $('body').on('click', '.customerOrderKeyboard .key', function() {
        if($("#holdCustomerOrderInput").is(":focus")) {
            searchCustomerOrders();
        }          
    });



    var $list = $('.list-group-item').click(function () {
    //    $list.removeClass('active');
       $(this).siblings('.list-group-item').removeClass('active');
       $(this).addClass('active');
       if(this.id == 'check'){
            $("#cardInfo").show();
            $("#cardInfo .input-group-addon").text("Check Info");
       }else if(this.id == 'card'){
           $("#cardInfo").show();
           $("#creditInfo").hide();
           $("#digits").show();
           $("#paymentAmount").show();
           $("#cardInfo .input-group-addon").text("Info. de la tarjeta");
       }else if(this.id == 'cash'){
           $("#cardInfo").hide();
           $("#creditInfo").hide();
           $("#digits").show();
           $("#paymentAmount").show();
       }else if(this.id == 'credit'){
        $("#cardInfo").hide();
        $("#creditInfo").show();
        $("#digits").hide();
        $("#paymentAmount").hide();
       }
    });


    $.fn.go = function (value,isDueInput) {
        if(isDueInput){
            $("#refNumber").val($("#refNumber").val()+""+value)
        }else{
            $("#payment").val($("#payment").val()+""+value);
            $(this).calculateChange();
        }
    }


    $.fn.digits = function(){
        $("#payment").val($("#payment").val()+".");
        $(this).calculateChange();
    }

    $.fn.calculateChange = function () {
        var change = $("#payablePrice").val() - $("#payment").val();

        if(change <= 0){
            $("#change").text(change.toFixed(2));
        }else{
            $("#change").text('0')
        }
        if(change <= 0){
            $("#confirmPayment").show();
        }else{
            $("#confirmPayment").hide();
        }
    }

    $.fn.calculateDues = function () {
        
        var dues = 0;
        var valDate = true;
        var isEmpty  = false;

        var  credits = $('#creditInfo input[type=number]');
        var  dates = $('.dateInfo');

        $.each( credits, function( key, value ) {
            if ($(value).val() === '' || $(value).val() === '0') {
                isEmpty  = true;
            }
            dues += parseFloat($(value).val() || 0);
        });
        if (isEmpty) {
            $("#confirmPayment").hide(); 
            return;
        }

        $.each( dates, function( key, value ) {

            if ( !$(value).val()) {
                
                valDate = false;
            };
        });

        if (dues.toFixed(2) === parseFloat($('#payablePrice').val()).toFixed(2) && valDate ) {
            $("#confirmPayment").show();
        } else {
            $("#confirmPayment").hide();            
        }
    }
})