'use strict';

var factories = [
	{
		'nome': 'restItemAjudaCampoSvc',
		'url': '/rest/ItemAjuda/Campo'
	},
	{
		'nome': 'restTelaAjudaTemplateSvc',
		'url': '/rest/TelaAjuda/Template/:id'
	}
	];

//método criado para carregar manualmente o AngularJS
//Após o carregamento da página o sistema irá redirecionar para a tela de login
//caso não queira utilizar autenticação, é possóvel manter o bloco, retirando todo o seu conteúdo e mantendo apenas a linha:
angular.element(document).ready(function () {
    //desabilita o cache
    $.ajaxSetup({
        xhrFields: {
            withCredentials: true
        }
    });
    $.get(URL_SISTEMA + '/rest/Usuario', function (data) {
        if (data.name === undefined) {

            sessionStorage.removeItem('ngStorage-usuario');
            sessionStorage.removeItem('ngStorage-usuarioPerfil');

            window.location = URL_SISTEMA + '/';
        } else {
            angular.bootstrap(angular.element(document), ['BSTNApp']);
        }
    }).fail(function () {        
        window.location = URL_SISTEMA + '/';
    });
});

angular.module('stn-framework-frontend',[])

/*//////////////////////////CONFIG///////////////////////////// */
.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push(function($q) {
        return {
            'responseError': function(rejection){
                var defer = $q.defer();
							
                if(rejection.status == 401){
					
                }
                defer.reject(rejection);
                return defer.promise;
            }
        };
    });

}])
.config(function($provide) {
    $provide.decorator("$exceptionHandler", function($delegate,$injector) {		
		return function(exception, cause) {			
           if (exception.message.indexOf("Error in resource configuration for action `query`. Expected response to contain an array but got an object") > -1){				
				var stateService = $injector.get('$state');
				localStorage.usuario = JSON.stringify({});
				localStorage.usuarioPerfil = "";
				localStorage.logado = false;	
				localStorage.perfilSet = undefined;			
				stateService.go('login');
		   }
		   else{
			$delegate(exception, cause);			
		   }
		   
		};
	});
})
.config(['ngDialogProvider', function (ngDialogProvider) {
    ngDialogProvider.setDefaults({
          disableAnimation : false
    });
}])
.run(function ($rootScope, $location,perfilSvc ) {
	//checa o login a cada mudança de página
	$rootScope.next = '';
	$rootScope.$on('$locationChangeStart', function(data,next ) {			
		$rootScope.next = next;
		perfilSvc.checarLogin();		
	});
})

.run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/popover/popover.html",
      "<div class=\"popover {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
      "  <div class=\"arrow\"></div>\n" +
      "\n" +
      "  <div class=\"popover-inner\">\n" +
      "      <h3 class=\"popover-title\" ng-bind-html=\"title | unsafe\" ng-show=\"title\"></h3>\n" +
      "      <div class=\"popover-content\"ng-bind-html=\"content | unsafe\"></div>\n" +
      "  </div>\n" +
      "</div>\n" +
      "");
}])
.run(function () {   
	//configurações do gridview
    TrNgGrid.tableCssClass = 'tr-ng-grid table table-striped table-hover';
	var defaultTranslation = {};
    var ptbrTranslation = angular.extend({}, defaultTranslation, 
        {
        'Born': 'Born',
        'Search': 'Buscar',
        'Page':'Página',
        'First Page': 'Primeira Página',
        'Next Page': 'Próxima Página',
        'Previous Page': 'Página Anterior',
        'Last Page': 'Última Página',
        'Sort': 'Ordenar',
        'No items to display': 'Nenhum item a ser exibido',
        'displayed': 'exibido(s)',
        'in total': 'no total'
        });
    TrNgGrid.translations['pt-br'] = ptbrTranslation;
})
.config(['$httpProvider', function($httpProvider) {
	$httpProvider.defaults.withCredentials = true;
	$httpProvider.defaults.headers['delete'] = {
	  'Content-Type': 'application/json;charset=utf-8'
	};
  }])

/*//////////////////////////FACTORIES///////////////////////////// */
    .factory('LoginSvc', function($resource){ 
	return $resource(URL_SISTEMA +'/rest/Usuario');
	})  
	.factory('logoutSvc', function($resource){ //servico para logout
		return $resource(URL_SISTEMA +'/rest/Usuario/Sair'  );
	})
	.factory('authFactory', function(metaFactory,$route){
		var objAuth = {};
		var permissoesTela = [];
		
		objAuth.ajustarPagina = function(escopo){
			
			escopo.matrixPermissoes = [];
		};
		
		objAuth.prepararChecarAcessoLink = function (escopo) {
			var acessoLink = [];		
			var mostrarBuscaAvancada = false;
		}
		
		return objAuth;
	})
/////////////////////CRUDSERVICE////////////////////////////

	.factory('crudService', function(metaFactory, ngDialog, toastr,  $rootScope, ajudaSvc, $location,utilsSvc) {
		var _obj = {};
		var templateDetalhar;
		var _scope;
		
		_obj.prepararCrudService = function(escopo) {
			_scope = escopo;
			_scope.modalCriar = function(){_obj.modalCriar()}; 
			_scope.modalAtualizar = function(id) {_obj.modalAtualizar(id)};
			_scope.modalConfirmarRemover = function(id) {_obj.modalConfirmarRemover(id)};
			_scope.criar = function() {_obj.criar()};
			_scope.lerUm = function(id) {_obj.lerUm(id)};
			_scope.lerTodos = function(){_obj.lerTodos()};
			_scope.atualizar = function() {_obj.atualizar()};
			_scope.remover = function(id) {_obj.remover(id)};
			_scope.salvar = function() {_obj.salvar()};
			
			// Array de linhas selecionadas. usado para as teclas de atalho.
			_scope.linhasSelecionadas = [];
			
			
		}
		
		// Abre a modal para criar novo item.
		_obj.modalCriar = function(large) {
			_scope.obj = {};
			ajudaSvc.templateModal = _obj.templateInserir;
			
			if (large !== undefined) {
				ngDialog.open({
					template: _obj.templateInserir,
					scope: _scope,
					className: 'ngdialog-theme-default ngdialog-large'
				});
			} else {
				ngDialog.open({
					template: _obj.templateInserir,
					scope: _scope
				});
			}
		};
		
		// Abre modal para atualizar item existente.
		_obj.modalAtualizar = function(id, large) {
			metaFactory[_obj.factory].get({ id: id }, function(dataModalEditar) {
				_scope.obj = dataModalEditar;
				
				//função que permite a execução de métodos após o carregamento da modal
				try{
					_scope.postModalEditar();
				} catch(err) {				
				}
				
				ajudaSvc.templateModal = _obj.templateEditar;
				if (large !== undefined) {
					ngDialog.open({
						template: _obj.templateEditar,
						scope: _scope,
						className: 'ngdialog-theme-default ngdialog-large'
					});
				} else {
					ngDialog.open({
						template: _obj.templateEditar,
						scope: _scope
					});
				}
			}, function() {
				toastr.error('Erro ao buscar objeto.');
			});
		};
	
		// Abre a modal de remoção de item.
		_obj.modalConfirmarRemover = function(id) {
			ngDialog.openConfirm({
				template: '<legend class=topo-modal>Confirmar exclusão</legend>\t\t\t\t<p>Tem certeza que deseja remover esse item?</p>\t\t\t\t<div class="ngdialog-buttons">\t\t\t\t\t<button type="button" class="ngdialog-button btn-primary" ng-click="closeThisDialog(0)">N\xE3o</button>\t\t\t\t\t<button type="button" class="ngdialog-button  btn-danger" auto-focus=true ng-click="confirm(1)">Sim</button>\t\t\t\t</div>',
				plain: true
			}).then(function() {
				_scope.remover(id);
			}, function() {
				toastr.info('Item n\xE3o removido.');
			});
		};
		
		// Insere um novo item.
		_obj.criar = function() {
			metaFactory[_obj.factory].save(_scope.obj, function(data) {			
				utilsSvc.tratarResposta(data);			
				ngDialog.closeAll();
				_scope.lerTodos();
				
	
			}, function(data){utilsSvc.tratarErro(data)})
			
		};
		
		_obj.lerUm = function(obj, large) {
			metaFactory[_obj.factory].get({id: obj.id}, function(data) {
				_scope.obj = data;
				ajudaSvc.templateModal = _obj.templateDetalhar;
				
				//efetua a leitura do registro de auditoria
				metaFactory[_obj.factory+'Auditoria'].get({id: obj.id}, function(dataAuditoria) {				
					_scope.obj.logAuditoria = dataAuditoria;
				
					if (large !== undefined) {
						ngDialog.open({
							template: _obj.templateDetalhar,
							scope: _scope,
							closeByEscape: false,
							className: 'ngdialog-theme-default ngdialog-large'
						});
					} else {
						ngDialog.open({
							template: _obj.templateDetalhar,
							scope: _scope
						});
					}
				});
			}, function() {
				toastr.error('Erro ao buscar dados.');
			});
		};
	
		_obj.lerTodos = function() {
			var ordenacao = '';
			if (_obj.ordenado==true){
				ordenacao='Ordenado';
			}
			metaFactory[_obj.factory+ordenacao].query(function(data) {
				_scope.dadosGrid = data;
				if (data.length === 0) {
					toastr.info('N\xE3o h\xE1 registros cadastrados.');
					$('dadosGrid').hide();
				} else {
					$('dadosGrid').show();
				}
			}, function() {
				toastr.error('erro ao buscar registros.');
			});
		};
	
		_obj.atualizar = function() {
			metaFactory[_obj.factory].update(_scope.obj, function() {
				toastr.success('Registro atualizado com sucesso.');
				ngDialog.closeAll();
				_scope.lerTodos();
				
				// Mudando o location no caso do serviço, já que não tem modal.
				if (_obj.factory === 'restServicoSvc'){
					$location.path('/Servico/');
				}
			}, function(data){utilsSvc.tratarErro(data)});
		};
		
		_obj.remover = function(id) {
			_scope.obj.id = id;
			
			metaFactory[_obj.factory].remove(_scope.obj, function() {
				toastr.success('Registro removido com sucesso.');
				_scope.lerTodos();
			},function(data){ utilsSvc.tratarErro(data)}
			
			);
		};
		
		_obj.salvar = function() {
			if (isNaN(_scope.obj.id) || _scope.obj.id === '') {
				_scope.criar();
			} else {
				_scope.atualizar();
			}
		};
		
		return _obj;
	})

    ///////////////////////////////////FILTERS//////////////////////////////////////////

    .filter('booleano', function() {
	return function(input) {
		if (input===true) {
			return "Sim";
		} else {
			return "Não";
		}
	};
})
.filter('tipoOperacaoHibernate', function() {
	return function(input) {
		switch(input){
			case 1:
				return 'Modificado';
			case 0:
				return 'Adicionado';
			case 2:
				return 'Removido';	
		}
	};
})
.filter('cpf', function() {
	return function(input) {
		if (input != undefined){
			if (input.length==14){
				//já formatado
				return input;
			} else{
				
				//completa com os zeros eliminados pelo banco
				while (input.length < 11){
					input= '0'+input;
				}		
				
				input=input.replace(/\D/g,"")                 //Remove tudo o que não é dígito
				input=input.replace(/(\d{3})(\d)/,"$1.$2")    //Coloca ponto entre o terceiro e o quarto dígitos
				input=input.replace(/(\d{3})(\d)/,"$1.$2")    //Coloca ponto entre o setimo e o oitava dígitos
				input=input.replace(/(\d{3})(\d)/,"$1-$2")   //Coloca traço entre o decimoprimeiro e o decimosegundo dígitos
				return  input;
			}
		} else {
			return '';
		}
	};
})
.filter('gliphTipoOperacaoHibernate', function() {
	return function(input) {
		switch(input) {
			case 1:
				return 'glyphicon glyphicon-pencil';
			case 0:
				return 'glyphicon glyphicon-saved';
			case 2:
				return 'glyphicon glyphicon-trash';	
		}
	};
})



.filter('valorPadrao', function() {
	return function(input) {
		if(input=="" || input==undefined) {
			return "Não Informado";
		} else {
			return input;
		}
	};
})
.filter('unsafe', ['$sce', function($sce) {
	return function(val) {
		return $sce.trustAsHtml(val);
	};
}])
.filter('tipoMedidaTempo', function() {
	return function(input) {
		switch(input) {
			case 'H':
				return 'Hora(s)';
			case 'M':
				return 'Minuto(s)';
			case 'D':
				return 'Dia(s)';
		}
	};
})
.filter('htmlFilter', function($sce) {
	return function(input) {
		return $sce.trustAsHtml(input);
	};
})
.filter('telefone', function() {
	return function(input) {
		if (input == "" || input == undefined || input.charAt(0) == "N") {
			return "Não Informado";
		} else {
			switch(input.length) {
				case 10:
					return "(" + input.substr(0, 2) + ") " + input.substr(2, 4) + "-" + input.substr(6, 4);
				case 11:
					return "(" + input.substr(0, 2) + ") " + input.substr(2, 5) + "-" + input.substr(7, 4);
				case 9:
				case 14:
				case 15:
					return input;
			}
		}
	};
})

    ///////////////////////////////////SERVICES/////////////////////////////////////////

	.service('roleSvc',function(){	 
		this.isInRole = function(role){		 		 
			if (localStorage.usuarioPerfil === role){			 									
				return true;			 
			}else {							
			   return false;
			}	
	   };
	})
	.service('menuSvc',function(){
		this.alterarMenu = function(){
			var usuario = JSON.parse(localStorage.usuario);		 		 
		   if (usuario.name!==undefined) {
			   $('#linkLogin').hide();
			   $('#UsuarioLogado').show();
			   $('#divMenu').show();			
			   
		   } else {
			   $('#linkLogin').show();
			   $('#UsuarioLogado').hide();
			   $('#divMenu').hide();										
		   }				 
		};	 
	})
	.service('ajudaSvc',function(metaFactory,$rootScope,ngDialog,toastr,$sce,$templateRequest,$compile,$route){
	   
	   //variavel que armazena o template sendo utilizado no momento
	   this.templateModal = '';
	   
	   //função que identifica qual template utilizar 
	   this.buscarTemplateCorrente = function(){
		   var template;
		   
		   //caso exista informa? de template na ajudaSvc, utiliza essa info no lugar do routeProvider. 
		   if (this.templateModal =='' ){
			   template = $route.current.templateUrl;			
		   }else{
			   template = this.templateModal;			
		   }
		   
		   //ajusta o nome do template preservando apenas o nome
		   
		   template = template.substring(6,template.length-5).toLowerCase();
		   
		   return template;
	   }
	   
	   this.exibirAjudaTela = function(escopo){	
		   var template;
		   template = this.buscarTemplateCorrente();	
						   
		   //busca os dados da tela
		   metaFactory['restTelaAjudaTemplateSvc'].get({id:template},function(dataTela){
			   escopo.ajuda = dataTela;
			   if (dataTela.textoAjuda==null){
				   dataTela.textoAjuda = "O texto de ajuda ainda não foi cadastrado.";
			   }
			   escopo.divConteudoTextoAjudaTela = $sce.trustAsHtml(dataTela.textoAjuda);
			   
			   //busca os campos da tela
			   if (dataTela.id != null){
				   metaFactory['restItemAjudaTelaSvc'].query({id:dataTela.id},function(dataCampo){					
					   escopo.ajuda.itensAjuda = dataCampo;
				   });			
			   }
			   escopo.modalAjudaTela = ngDialog.open({
				   template: 'views/ajudaTela.html',
				   scope:escopo,
				   closeByEscape: false
			   });		
		   });	
	   }	
	   
	   //adiciona ao escopo a função de inserir novo item de ajuda
	   this.prepararAjuda = function(escopo,servico){		
		   
		   escopo.manterAjuda =  function(nomeCampo,nomeControlador,rotuloCampo){
			   servico.manterAjuda(nomeCampo,nomeControlador,rotuloCampo);
		   }
		   escopo.exibirAjuda =  function(nomeCampo,nomeControlador,rotuloCampo){			
			   servico.exibirAjuda(nomeCampo,nomeControlador,rotuloCampo);
		   }
		   
		   escopo.exibirAjudaTela =  function(){			
			   servico.exibirAjudaTela(escopo);
		   }
		   
		   escopo.trustAsHtml = $sce.trustAsHtml;
		   
	   }
	   
	   
	   //fun? que abre a modal com as informa?s da ajuda do campo
	   this.exibirAjuda = function(nomeCampo,nomeTemplate,rotuloCampo){			
		   var parent = $rootScope;
		   var novoScopo = parent.$new();
		   var campoTmp = {};
		   campoTmp.campo = nomeCampo;
		   campoTmp.telaAjuda = {};
		   campoTmp.telaAjuda.template = nomeTemplate;		
		   metaFactory['restItemAjudaCampoSvc'].save('',campoTmp,function(data){
			   novoScopo.obj = data;
			   if (data.textoAjuda == null){
				   data.textoAjuda = "Ajuda não cadastrada para o campo " + rotuloCampo + ".";
			   }
			   novoScopo.divConteudoTextoAjuda = $sce.trustAsHtml(data.textoAjuda);
			   novoScopo.rotuloCampo = rotuloCampo;
			   novoScopo.modalDetalhesAjudaCampo = ngDialog.open({
				   template: 'views/ItemAjuda_campo_detalhe.html',				
				   scope: novoScopo,
				   closeByEscape: false				
			   });
		   });
	   }	
	   
	   //fun? chamada quando o usu?o est?om o perfil admin e tenta abrir a ajuda.
	   //exbie a tela de edi? de ajuda
	   this.manterAjuda = function(nomeCampo,nomeTemplate,rotuloCampo){	
	   var parent = $rootScope;
	   var novoScopo = parent.$new();
	   var campoTmp = {};
	   campoTmp.campo = nomeCampo;
	   campoTmp.telaAjuda = {};
	   campoTmp.telaAjuda.template = nomeTemplate;		
	   
	   
	   //recupera os dados da tela
	   metaFactory['restTelaAjudaTemplateSvc'].get({id:this.buscarTemplateCorrente()},function(dataTela){
		   if (dataTela.id == null){
			   toastr.error('Tela não cadastrada.');
		   } else {
			   //recupera as informa?s do campo		
			   metaFactory['restItemAjudaCampoSvc'].save('',campoTmp,function(dataCampo){
				   var objTela = dataTela;
				   novoScopo.telasAjuda = [];
				   novoScopo.telasAjuda.push(objTela);
			   
				   //inicializa as variaveis e já preenche os campos com os valores passados pela função		
				   novoScopo.obj = dataCampo;		
				   novoScopo.campos = [];		
				   novoScopo.obj.campo = nomeCampo;
				   novoScopo.campos.push({nome:nomeCampo,label:rotuloCampo});	
				   novoScopo.obj.telaAjuda= {};
				   novoScopo.obj.telaAjuda.id = objTela.id;
		   
			   });
			   
			   //exibe a modal para editar o campo
			   novoScopo.modalInserirAjuda = ngDialog.open({
				   template: 'views/ItemAjuda_form.html',				
				   scope: novoScopo,
				   className: 'ngdialog-theme-default ngdialog-large'				
			   });
			   
			   var tratarErro = function(data){
				   if (data.status == 499) {
					   var strErro = "<ol>";					
					   var timeOut = 5000;
					   for (var x = 0; x < data.data.length; x++) {
						   strErro += "<li>";
						   strErro += data.data[x];
						   strErro += "</li>";
						   timeOut += 1000;
					   }
					   strErro +="</ol>";
					   toastr.warning(strErro, 'Ocorreram erros de validação', {allowHtml: true, timeOut : timeOut});
				   } else {
					   toastr.error('Erro ao cadastrar item.');
				   }
			   };
   
			   novoScopo.salvarItemAjuda = function (){
				   novoScopo.obj.rotulo =novoScopo.campos[novoScopo.campos.map(function(e) { return e.nome; }).indexOf(novoScopo.obj.campo)].label;
				   if (novoScopo.obj.id == undefined){
					   metaFactory['restItemAjudaSvc'].save(novoScopo.obj, function () {
						   toastr.success('Item cadastrado com sucesso.');
						   ngDialog.close(novoScopo.modalInserirAjuda.id);				
					   }, function (data) {
						   tratarErro(data);
					   });
				   }else{			
					   metaFactory['restItemAjudaSvc'].update({'id':novoScopo.obj.id},novoScopo.obj, function () {
						   toastr.success('Item cadastrado com sucesso.');
						   ngDialog.close(novoScopo.modalInserirAjuda.id);				
					   }, function (data) {
						   tratarErro(data);
					   });
				   }
			   };	
			   
		   
		   }
		   
	   
	   });	
	   } 
	})
	.service('perfilSvc', function(LoginSvc, $rootScope, $location,menuSvc, toastr) {	
	
	
		this.checarLogin = function() {
		   var parent = $rootScope;
		   var novoScopo = parent.$new();
		   var usuario = {};
		   
			if (JSON.parse(localStorage.getItem('usuario'))==null){
				localStorage.usuario=JSON.stringify({});
			}
		   LoginSvc.get({}, function (data){
			   if (data.name === undefined || data.name === '') {
				   localStorage.logado = "false";
				   if ($rootScope.next.indexOf('/login') > -1){
					   //indo para o login				
					   if(localStorage.logado === "true"){									
						   //usuario ja logado. impede de ir para o login
						   if (localStorage.proximaUrl==undefined || localStorage.proximaUrl==""){						
							   
							 $location.path('/');
						   } else {						
							   $location.path(localStorage.proximaUrl.substr(localStorage.proximaUrl.indexOf('#')+1));
						   }					
					   }
				   }else {						
					   if(localStorage.logado === "false"){
						   //usuario n?logado. for?login	
						   localStorage.usuario = JSON.stringify({});
						   localStorage.usuarioPerfil = "";
						   localStorage.logado = "false";	
						   localStorage.perfilSet = undefined;								
						   localStorage.proximaUrl = $rootScope.next;
						   
						   $location.path( '/login' );	
						   $rootScope.usuarioLogado = false;
					   }
				   }
			   }else{
				   usuario = data;				
				   localStorage.usuario = JSON.stringify(usuario);	
				   
				   novoScopo.perfils = [];
				   //preenche a variável de perfils "novoScopo.perfils" sem considerar os perfis do business-central "admin" e "user"
				   
				   for (var i = 0; i < data.roles.length; i++){
					   if (data.roles[i] !== "admin" && data.roles[i] !== "user"){					
						   novoScopo.perfils.push(data.roles[i]);
					   }
				   }
		   
				   if (localStorage.logado === "false"){
					   novoScopo.perfilEscolhido = novoScopo.perfils[0];					
					   if (localStorage.proximaUrl==undefined || localStorage.proximaUrl==""){						
						   
						   $location.path('/');
					   } else {				
						   
						   $location.path(localStorage.proximaUrl.substr(localStorage.proximaUrl.indexOf('#')+1));
					   }
					   localStorage.proximaUrl = "";
					   $rootScope.usuarioLogado = true;
					   localStorage.logado = "true";
					   menuSvc.alterarMenu();
				   }
			   }	
		   }, function() {
			   //tratamento de erro
			   toastr.error('Sistema indisponível. ');
			   localStorage.usuario = JSON.stringify({});
			   localStorage.usuarioPerfil = "";
			   localStorage.logado = "false";	
			   localStorage.perfilSet = undefined;		
			   $location.path( '/login' );
		   });
		   menuSvc.alterarMenu();
		   
		}
   
   })
   ////////////////////////////DIRETIVAS//////////////////////////////////////////////
.directive('stnCampoDinamicoEditar', function () {	
	return {
		
		 scope: { obj: '=' },
 
		 compile: function(){			//tElem, tAttrs
			 return {
				 pre: function(scope, iElem){//, iAttrs  
				 
									 var campoObrigatorio = '';
					 if (scope.obj.campoCategoria.obrigatorio==true){
						 campoObrigatorio='required';
					 }
				 
					 if (scope.obj.txValor===undefined){scope.obj.txValor='';}
					 var strTexto = '<input type=text value="'+scope.obj.txValor+'" mask data-mask="99/99/9999"  minlength='+scope.obj.comprimentoMinimo +' maxlength='+scope.obj.comprimentoMaximo+'  '+campoObrigatorio+' class="form-control  '+scope.obj.mascara.cssMascara+'" id='+scope.obj.id+' />';
					 var strAreaTexto = '<textarea value="'+scope.obj.txValor+'"   minlength='+scope.obj.comprimentoMinimo +' maxlength='+scope.obj.comprimentoMaximo+'    '+campoObrigatorio+'  class=form-control id='+scope.obj.id+' ></textarea>';
					 var strNumero = '<input type=number value="'+scope.obj.nrValor+'" minlength='+scope.obj.comprimentoMinimo +' maxlength='+scope.obj.comprimentoMaximo+'   '+campoObrigatorio+'  class=form-control id='+scope.obj.id+' />';					
					 var strData = '<input type=date value="'+scope.obj.dtValor+'"  '+campoObrigatorio+' class=form-control id='+scope.obj.id+' />';
										 
					 
					 var strTemplate;
					 
					 if (scope.obj.campoCategoria.tipoCampo==='T'){
						 strTemplate= strTexto;
					 }else if (scope.obj.campoCategoria.tipoCampo==='A'){
						 strTemplate= strAreaTexto;
					 }else if (scope.obj.campoCategoria.tipoCampo==='N'){
						 strTemplate= strNumero;
					 }else if (scope.obj.campoCategoria.tipoCampo==='D'){
						 strTemplate= strData;
					 }else if (scope.obj.campoCategoria.tipoCampo==='S'){
						 var strCombo = '<select class=form-control ng-required='+scope.obj.obrigatorio+' id='+scope.obj.id+'>' ;
						 angular.forEach(scope.obj.dominio.split(","),function(value){
							 strCombo = strCombo + '<option value=' + value.trim() + '>' + value.trim() + '</option>';
						 });
						 strTemplate= strCombo;
					 }else{
						 strTemplate= strTexto;
					 }
					 
					 iElem[0].innerHTML = strTemplate;
								 
				 }
			 };
		 }
	 };
 })
 .directive('registroHistorico', function ($filter) {	
	return {
		 restrict: 'E',
		 scope: { registroHistorico: '=' },
 
		 compile: function(){			//tElem, tAttrs 
			 return {
				 pre: function(scope, iElem){//, iAttrs										
 
					 if (scope.registroHistorico.logAuditoria.acao!=undefined){						
						 iElem[0].innerHTML =  '<small><span class="'+$filter('gliphTipoOperacaoHibernate')(scope.registroHistorico.logAuditoria.acao)+'"></span> <i>' + $filter('tipoOperacaoHibernate')(scope.registroHistorico.logAuditoria.acao) +' por ' + scope.registroHistorico.logAuditoria.usuario +' em ' +$filter('date')(scope.registroHistorico.logAuditoria.dtRegistro,'dd/MM/yyyy HH:mm:ss') + '</i></small>';					
					 } else{
						 iElem[0].innerHTML =  '<small>Auditoria não disponível. Elemento inserido diretamente no banco de dados.</small>';
					 }
				 }
			 };
		 }
	 };
 })
 .directive('errSrc', function() {
   return {
	 link: function(scope, element, attrs) {
	   var defaultSrc = attrs.src;
	   element.bind('error', function() {
		 if(attrs.errSrc) {
			 element.attr('src', attrs.errSrc);
		 }
		 else if(attrs.src) {
			 element.attr('src', defaultSrc);
		 }
	   });
	 }
   }
 })
 .directive('autoFocus', function($timeout, $parse) {
   return {
	 //scope: true,   // optionally create a child scope
	 link: function(scope, element, attrs) {
	   var model = $parse(attrs.autoFocus);
	   scope.$watch(model, function(value) {        
		 if(value === true) { 
		   $timeout(function() {
			 document.activeElement.blur();			
			 element[0].focus(); 
			 
		   });
		 }
	   });
	   
	 }
   };
 })
 .directive("stnHelp", function($parse,$route,ajudaSvc) {
   return {
	 compile: function(tElm,tAttrs){
		 var templateFuncao;
		 var rotulo;
		 var template;
		 var textoEl  = tElm[0].innerText;
		 
		 if(textoEl.substring(textoEl.length-1,textoEl.length)==":"){
			 
			 rotulo = textoEl.substring(0,textoEl.length-1);
		 } else {
			 rotulo = textoEl;
		 }
				 
		 template = ajudaSvc.buscarTemplateCorrente();
		 
		 //define a ação de acordo com o perfil 
		 if (localStorage.usuarioPerfil=='Documentador'){						
			 templateFuncao = 'manterAjuda(\''+tAttrs.stnHelp+'\',\''+template+'\',\''+rotulo+'\')';
		 }else {			
			 templateFuncao = 'exibirAjuda(\''+tAttrs.stnHelp+'\',\''+template +'\',\''+rotulo+'\')';
		 }
		 
		 //faz o bind no elemento
	   var exp = $parse(templateFuncao);
	   return function (scope,elm){
		 elm.bind('click',function(){
		   exp(scope);
		 });  
	   };
	 }
   };
 })

 ////////////////FUNCOES COMPARTILHADAS//////////////////////////////////

 .factory('utilsSvc',function(toastr,ngDialog,$http){
	var _obj = {};
	var _scope;
	var _arrArquivos;
	_obj.mensagem = 'Erro ao realizar operação.';
	_obj.enumFormato = [{id:'C',valor:'CSV'},{id:'J' ,valor:'JSON'}];
	_obj.enumFrequencia = [{id:'D',valor:'Diária'},{id:'S' ,valor:'Semanal'},{id:'M' ,valor:'Mensal - Dia específico'},{
		id:'P' ,valor:'Mensal - Primeiro dia útil do mês'},{id:'U' ,valor:'Mensal - Último dia útil do mês'},{id:'I' ,valor:'Manual'}];
	_obj.enumDiaSemana	= [
		{id:1,valor:'Domingo'},{id:2 ,valor:'Segunda-feira'},
		{id:3 ,valor:'Terça-feira'},{id:4 ,valor:'Quarta-feira'},
		{id:5 ,valor:'Quinta-feira'},{id:6 ,valor:'Sexta-feira'},{id:7 ,valor:'Sábado'}
	];
	_obj.enumMes = [
		{id:1 ,valor:'Janeiro'},{id:2 ,valor:'Fevereiro'},
		{id:3 ,valor:'Março'},{id:4 ,valor:'Abril'},
		{id:5 ,valor:'Maio'},{id:6 ,valor:'Junho'},
		{id:7 ,valor:'Julho'},{id:8 ,valor:'Agosto'},
		{id:9 ,valor:'Setembro'},{id:10 ,valor:'Outubro'},
		{id:11 ,valor:'Novembro'},{id:12 ,valor:'Dezembro'}
	];
	
	_obj.enumTipoParametro = [{id:'I',valor:'Número Inteiro'},{id:'F' ,valor:'Decimal'},{id:'D' ,valor:'Data'},{id:'T' ,valor:'Texto'}];
	

	
	//inicializa as funções inserindo-as no $scope
	_obj.carregarFuncoes = function(escopo) {
		_scope = escopo;				
		_arrArquivos = [];
		
	};

	//método auxiliar para montar a lista de erros retornada pelo endpoint
	var montarListaErros = function(body){
		var retorno = '';
		if (Array.isArray(body)){					
			for (var x = 0; x < body.length; x++) {
				retorno += "<li>";
				retorno += body[x];
				retorno += "</li>";						
			}					
		} else {
			retorno = body;
		}
		return retorno;
	}
	
	//função genérica para tratamento de resposta utilizando o objeto de resposta tipado
	_obj.tratarResposta = function(data){			
		if (data.codigoRetorno===undefined){
			//Tratamento para o caso do endpoint ainda não utilizar o formato tratado
			toastr.success('Operação realizada com sucesso.');
		} else {						
			if (data.codigoRetorno === 'SUCESSO'){
				toastr.success(data.mensagem);					
			} else if (data.codigoRetorno === 'AVISO'){			
				if (data.body!==undefined){				
					toastr.warning(montarListaErros(data.body), {allowHtml: true});
				} else {
					toastr.warning(data.mensagem);
				}				
			} else if (data.codigoRetorno === 'ERRO'){			
				if (data.body!==undefined){				
					toastr.error(montarListaErros(data.body),data.mensagem, {allowHtml: true});
				} else {
					toastr.error(data.mensagem);
				}
			}		
		}
	}
	
	
	//função genérica para tratamento de erro do backend de validação
	_obj.tratarErro = function (data) {		
		var strErro = "<ol>";
		if (data.status == 499) {		
			var x;
			var timeOut = 5000;
			
			for (x = 0; x < data.data.length; x++) {
				strErro += "<li>"+data.data[x]+"</li>";				
				timeOut += 1000;
			}			
			strErro +="</ol>";
			toastr.warning(strErro, 'Ocorreram erros de validação', {allowHtml: true, timeOut: timeOut});			
		}
		else if (data.status == 498 || data.status == 497) {
			strErro += "<li>" +data.data+"</li></ol>";			
			toastr.warning(strErro, 'Ocorreram erros de validação', {allowHtml: true});
		} else {
			toastr.error(_obj.mensagem);
		}
		ngDialog.closeAll();
	}
	
	_obj.downloadFile = function(httpPath,objParametros) {
    // Use an arraybuffer
	
    $http.post(httpPath,objParametros, { responseType: 'arraybuffer' })
    .success( function(data, status, headers) {

        var octetStreamMime = 'application/octet-stream';
        var success = false;

        // Get the headers
        headers = headers();

        // Get the filename from the x-filename header or default to "download.bin"
        var filename = headers['x-filename'] || 'download.bin';

        // Determine the content type from the header or default to "application/octet-stream"
        var contentType = headers['content-type'] || octetStreamMime;

        try
        {
            // Try using msSaveBlob if supported
            //
            var blob = new Blob([data], { type: contentType });
            if(navigator.msSaveBlob)
                navigator.msSaveBlob(blob, filename);
            else {
                // Try using other saveBlob implementations, if available
                var saveBlob = navigator.webkitSaveBlob || navigator.mozSaveBlob || navigator.saveBlob;
                if(saveBlob === undefined) throw "Not supported";
                saveBlob(blob, filename);
            }
         //   
            success = true;
        } catch(ex)
        {
          //  
          //  
        }

        if(!success)
        {
            // Get the blob url creator
            var urlCreator = window.URL || window.webkitURL || window.mozURL || window.msURL;
            if(urlCreator)
            {
                // Try to use a download link
                var link = document.createElement('a');
                if('download' in link)
                {
                    // Try to simulate a click
                    try
                    {
                        // Prepare a blob URL
                   //     
                        var blob2 = new Blob([data], { type: contentType });
                        var url2 = urlCreator.createObjectURL(blob2);
                        link.setAttribute('href', url2);

                        // Set the download attribute (Supported in Chrome 14+ / Firefox 20+)
                        link.setAttribute("download", filename);

                        // Simulate clicking the download link
                        var event = document.createEvent('MouseEvents');
                        event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                        link.dispatchEvent(event);
                      //  
                        success = true;

                    } catch(ex) {
                  //      
                   //     
                    }
                }

                if(!success)
                {
                    // Fallback to window.location method
                    try
                    {
                       
                        var blob3 = new Blob([data], { type: octetStreamMime });
                        var url3 = urlCreator.createObjectURL(blob3);
                        window.location = url3;
                        
                        success = true;
                    } catch(ex) {
                     
                    }
                }

            }
        }

        if(!success)
        {
            // Fallback to window.open method
			//    
            window.open(httpPath, '_blank', '');
        }
    })
    
};
  
	
				
	//função genérica para upload		
	_obj.upload = function (files,url) {
		
		var mb_file = 25;
		var max_file = mb_file * 1024 * 1024;
		
		if (files && files.length) {
			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				var nomeArquivo = "";
				
				// Verifica se o arquivo é maior que o tamanho máximo estipulado.
				if (file.size <= max_file) {
					$upload.upload({
						url: URL_SISTEMA + url,
						fields: {},
						file: file,
						fileName: encodeURIComponent(file.name)
					}).progress(function (evt) {
						var progressPercentage = parseInt(100 * evt.loaded / evt.total);
						_scope.uploading = true;
						_scope.progresso = progressPercentage;
						
						nomeArquivo = evt.config.file.name;
					}).success(function ( ) {
						_scope.uploading = false;
						var objUpload = {'nomeArquivo': nomeArquivo};			
						
						toastr.info("Arquivo " + nomeArquivo + " enviado com sucesso.");
						_scope.file = objUpload;
					});					
					
				} else {
					toastr.warning('O anexo deve ser menor que ' + mb_file + ' megabytes.');
				}
			}
		}
	};
	return _obj;
})
 